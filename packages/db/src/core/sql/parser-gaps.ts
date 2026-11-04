/** Sabitlenmiş parser'ın ayrıştıramadığı birkaç migration cümleciği: `ALTER COLUMN … TYPE … USING ifade`, `UNIQUE NULLS NOT
 * DISTINCT` ve `ALTER TYPE … ADD VALUE [IF NOT EXISTS] 'v' [BEFORE|AFTER 'w']`. Cümlecik yalnızca parser'a verilen kopyada
 * boşlukla örtülür (çıktı yine özgün kaynaktan üretilir), ayrıştırmadan sonra konumuyla tam o AST düğümüne bağlanır ve alan
 * olarak eklenir; grammar bu alanları normal kurallarla gezer. Bağlanamayan cümlecik reddedilir. Çalışma anı sorguları da aynı
 * mekanizmayı kullanır; ek olarak INTERSECT/EXCEPT, IS [NOT] DISTINCT FROM, GROUPING SETS ve pencere çerçevesi parser kopyasında
 * yerine konur/örtülür (SUBSTITUTES, FRAME). */
import { parse } from "pgsql-ast-parser";
import { AppError } from "../errors";

type Node = Record<string, unknown>;
type Span = { start: number; end: number };
type GapKind = "using" | "nulls not distinct" | "if not exists" | "enum position" | "recursive";
interface Gap extends Span {
  readonly kind: GapKind;
}

const unsupported = (detail: string): never => {
  throw new AppError("SQL_UNSUPPORTED", `SQL_UNSUPPORTED: ${detail}`);
};

// Tırnaklı metin ve tanımlayıcılar; yorumlar önceden maskelenmiş ve dolar tırnaklama reddedilmiştir.
const QUOTED = /[eE]'(?:[^'\\]|\\.|'')*'|'(?:[^']|'')*'|"(?:[^"]|"")*"/g;
const IDENTIFIER = String.raw`(?:"_*"|[A-Za-z_][\w$]*)`;
// Parser'ın ayrıştıramadığı ama anlamı yürüteç için gerekmeyen sözcükler parser kopyasında yerine konur. Çıktı özgün kaynaktan üretilir ve
// anlam PostgreSQL'de özgün metinden gelir; yürüteç yalnızca yaprak SELECT'lerin kapsamına, işlev izin listesine ve soldaki dalın çıktı
// adlarına bakar: bunlar yerine konan sözcüğün ağaç biçiminden ve önceliğinden etkilenmez. Yerine konan metin her zaman ilk sözcüğe sığar.
const word = (pattern: string) => new RegExp(String.raw`(?<![\w$])${pattern}(?![\w$])`, "gi");
const SUBSTITUTES: readonly (readonly [RegExp, string])[] = [
  [word("(?:INTERSECT|EXCEPT)"), "UNION"],
  [word(String.raw`IS\s+NOT\s+DISTINCT\s+FROM`), "="],
  [word(String.raw`IS\s+DISTINCT\s+FROM`), "<>"],
  [word(String.raw`GROUPING\s+SETS`), "ROLLUP"],
];
// Pencere çerçevesi: yalnızca `UNBOUNDED`/`CURRENT ROW`/tam sayı sınırları ve `OVER (…)` parantezinin sonunda; `EXCLUDE`, `$n` ve
// ifadeli ofset eşleşmez, çerçeve parser'a kalır ve reddedilir.
const BOUND = String.raw`(?:UNBOUNDED\s+(?:PRECEDING|FOLLOWING)|CURRENT\s+ROW|\d+\s+(?:PRECEDING|FOLLOWING))`;
const FRAME = new RegExp(String.raw`(?<![\w$])(?:ROWS|RANGE|GROUPS)\s+(?:BETWEEN\s+${BOUND}\s+AND\s+${BOUND}|${BOUND})(?=\s*\))`, "gi");

/** `[start, start + length)` aralığına `text` yazar, kalanını boşlukla örter; satır sonları korunur (konumlar değişmez). */
function overwrite(chars: string[], start: number, length: number, text: string): void {
  for (let i = 0; i < length; i++) if (chars[start + i] !== "\n" && chars[start + i] !== "\r") chars[start + i] = text[i] ?? " ";
}

const ENUM_ADD_VALUE = new RegExp(
  String.raw`^\s*ALTER\s+TYPE\s+${IDENTIFIER}(?:\s*\.\s*${IDENTIFIER})?\s+ADD\s+VALUE\s+(IF\s+NOT\s+EXISTS\s+)?'_*'(\s+(?:BEFORE|AFTER)\s+'_*')?\s*$`,
  "id",
);

/** Tırnak içlerini `_` ile örter: anahtar kelime aramaları metin/tanımlayıcı içeriğine takılmaz, konumlar değişmez. */
function codeView(masked: string): string {
  return masked.replace(QUOTED, (token) => token.replace(/(?<=^[eE]?['"])[\s\S]*(?=['"]$)/, (inner) => "_".repeat(inner.length)));
}

/** `;` ile ayrılmış deyim aralıkları (noktalı virgül hariç). */
function segments(code: string): Span[] {
  const spans: Span[] = [];
  let start = 0;
  for (let i = 0; i <= code.length; i++)
    if (i === code.length || code[i] === ";") {
      spans.push({ start, end: i });
      start = i + 1;
    }
  return spans;
}

/** Parantez derinliği 0 olan ve bir kelimenin ortasında başlamayan `pattern` (sticky) eşleşmelerinin başlangıçları. */
function topLevelMatches(code: string, { start, end }: Span, pattern: RegExp): number[] {
  const found: number[] = [];
  let depth = 0;
  for (let i = start; i < end; i++) {
    if (code[i] === "(") depth++;
    else if (code[i] === ")") depth--;
    else if (depth === 0 && !/[\w$]/.test(code[i - 1] ?? "")) {
      pattern.lastIndex = i;
      if (pattern.test(code)) found.push(i);
    }
  }
  return found;
}

/** ALTER TABLE deyimindeki her üst düzey `USING ifade`: ifade bir sonraki üst düzey virgüle veya deyim sonuna kadar sürer. */
function usingGaps(code: string, segment: Span): Gap[] {
  if (!/^\s*ALTER\s+TABLE\b/i.test(code.slice(segment.start, segment.end))) return [];
  const commas = topLevelMatches(code, segment, /,/y);
  return topLevelMatches(code, segment, /USING\b/iy).map((start) => ({
    kind: "using",
    start,
    end: commas.find((comma) => comma > start) ?? segment.end,
  }));
}

/** `ALTER TYPE … ADD VALUE` deyiminin tamamı sıkı biçime uyuyorsa `IF NOT EXISTS` ve `BEFORE|AFTER 'w'` parçaları. */
function enumGaps(code: string, segment: Span): Gap[] {
  const match = ENUM_ADD_VALUE.exec(code.slice(segment.start, segment.end));
  const gaps: Gap[] = [];
  for (const [group, kind] of [[1, "if not exists"], [2, "enum position"]] as const) {
    const indices = match?.indices?.[group];
    if (indices) gaps.push({ kind, start: segment.start + indices[0], end: segment.start + indices[1] });
  }
  return gaps;
}

/** `UNIQUE NULLS NOT DISTINCT` içindeki `NULLS NOT DISTINCT`. */
function nullsNotDistinctGaps(code: string): Gap[] {
  return [...code.matchAll(/\bUNIQUE(\s+)(NULLS\s+NOT\s+DISTINCT)\b/gi)].map((match) => {
    const start = match.index + "UNIQUE".length + (match[1]?.length ?? 0);
    return { kind: "nulls not distinct", start, end: start + (match[2]?.length ?? 0) };
  });
}

/** `WITH RECURSIVE` içindeki `RECURSIVE`. */
function recursiveGaps(code: string): Gap[] {
  return [...code.matchAll(/(?<![\w$])WITH(\s+)(RECURSIVE)(?![\w$])/gi)].map((match) => {
    const start = match.index + "WITH".length + (match[1]?.length ?? 0);
    return { kind: "recursive", start, end: start + (match[2]?.length ?? 0) };
  });
}

export interface ParserGaps {
  /** Parser'a verilecek kopya: cümlecikler eşit uzunlukta boşlukla örtülü. */
  readonly parsable: string;
  readonly gaps: readonly Gap[];
  readonly code: string;
}

/** Yorumları maskelenmiş migration kaynağındaki cümlecikleri bulur ve örter. */
export function findParserGaps(masked: string): ParserGaps {
  const code = codeView(masked);
  const gaps = [...nullsNotDistinctGaps(code), ...recursiveGaps(code), ...segments(code).flatMap((segment) => [...usingGaps(code, segment), ...enumGaps(code, segment)])];
  const chars = masked.split("");
  for (const { start, end } of gaps) for (let i = start; i < end; i++) if (!/\s/.test(chars[i] ?? "")) chars[i] = " ";
  for (const [pattern, text] of SUBSTITUTES) for (const match of code.matchAll(pattern)) overwrite(chars, match.index, match[0].length, text);
  for (const match of code.matchAll(FRAME)) overwrite(chars, match.index, match[0].length, "");
  return { parsable: chars.join(""), gaps, code };
}

const span = (node: unknown): Span | undefined => (node as Node | undefined)?._location as Span | undefined;
const blankBetween = (code: string, from: number, to: number) => from <= to && /^\)?\s*$/.test(code.slice(from, to));

/** Ayrı ayrıştırılan ifadenin konumlarını kaynaktaki yerine kaydırır. */
function shift(value: unknown, offset: number): void {
  if (Array.isArray(value)) for (const item of value) shift(item, offset);
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "_location") {
        const location = child as Span;
        location.start += offset;
        location.end += offset;
      } else shift(child, offset);
    }
  }
}

/** Cümleciğin başladığı deyim: başlangıcı cümlecikten önce olan son deyim. */
function statementAt(statements: readonly Node[], position: number): Node | undefined {
  return statements.filter((statement) => (span(statement)?.start ?? Infinity) <= position).at(-1);
}

/** `USING ifade`: hemen önünde biten `set type` değişikliğine ayrıştırılmış `using` ifadesi olarak eklenir. */
function attachUsing(statement: Node | undefined, gap: Gap, { code }: ParserGaps, masked: string): boolean {
  if (statement?.type !== "alter table") return false;
  const alter = (statement.changes as Node[])
    .map((change) => change.alter as Node | undefined)
    .find((candidate) => candidate?.type === "set type" && !candidate.using && blankBetween(code, span(candidate)?.end ?? Infinity, gap.start));
  if (!alter) return false;
  const exprStart = gap.start + "USING".length;
  let parsed: unknown;
  try {
    [parsed] = parse(masked.slice(exprStart, gap.end), { entry: "expr", locationTracking: true } as never) as unknown as unknown[];
  } catch {
    return unsupported("USING expression could not be parsed by the supported PostgreSQL grammar");
  }
  shift(parsed, exprStart);
  alter.using = parsed;
  return true;
}

/** Düğümün `UNIQUE` anahtar kelimesi (varsa `CONSTRAINT ad` ile) tam cümleciğin önünde bitiyorsa `nullsNotDistinct`. */
function attachNullsNotDistinct(value: unknown, gap: Gap, code: string): boolean {
  if (Array.isArray(value)) return value.some((item) => attachNullsNotDistinct(item, gap, code));
  if (!value || typeof value !== "object") return false;
  const node = value as Node;
  const start = span(node)?.start ?? Infinity;
  if (node.type === "unique" && start <= gap.start && new RegExp(String.raw`^(?:CONSTRAINT\s+${IDENTIFIER}\s+)?UNIQUE\s+$`, "i").test(code.slice(start, gap.start))) {
    node.nullsNotDistinct = true;
    return true;
  }
  return Object.entries(node).some(([key, child]) => key !== "_location" && attachNullsNotDistinct(child, gap, code));
}

/** `WITH` ile biten (varsa `(` ile başlayan) `with` düğümü `recursive` olur. */
function attachRecursive(value: unknown, gap: Gap, code: string): boolean {
  if (Array.isArray(value)) return value.some((item) => attachRecursive(item, gap, code));
  if (!value || typeof value !== "object") return false;
  const node = value as Node;
  const start = span(node)?.start ?? Infinity;
  if (node.type === "with" && start <= gap.start && /^[(\s]*WITH\s+$/i.test(code.slice(start, gap.start))) {
    node.recursive = true;
    return true;
  }
  return Object.entries(node).some(([key, child]) => key !== "_location" && attachRecursive(child, gap, code));
}

/** `IF NOT EXISTS` değerden önce, `BEFORE|AFTER 'w'` değerden sonra: `add value` değişikliğine alan olarak eklenir. */
function attachEnumClause(statement: Node | undefined, gap: Gap, code: string, masked: string): boolean {
  const change = statement?.type === "alter enum" ? (statement.change as Node) : undefined;
  const value = span(change?.add);
  if (change?.type !== "add value" || !value) return false;
  if (gap.kind === "if not exists" && blankBetween(code, gap.end, value.start)) change.ifNotExists = true;
  else if (gap.kind === "enum position" && blankBetween(code, value.end, gap.start)) {
    const [, keyword = "", literal = ""] = /^\s*(BEFORE|AFTER)\s+'([\s\S]*)'\s*$/i.exec(masked.slice(gap.start, gap.end)) ?? [];
    change[keyword.toLowerCase()] = literal.replaceAll("''", "'");
  } else return false;
  return true;
}

/** Her cümleciği AST'ye bağlar; sahipsiz kalan cümlecik reddedilir. */
export function attachParserGaps(statements: readonly Node[], found: ParserGaps, masked: string): void {
  for (const gap of found.gaps) {
    const statement = statementAt(statements, gap.start);
    const attached =
      gap.kind === "using"
        ? attachUsing(statement, gap, found, masked)
        : gap.kind === "nulls not distinct"
          ? attachNullsNotDistinct(statement, gap, found.code)
          : gap.kind === "recursive"
            ? attachRecursive(statement, gap, found.code)
            : attachEnumClause(statement, gap, found.code, masked);
    if (!attached) unsupported(`unsupported ${gap.kind.toUpperCase()} clause position`);
  }
}
