/** Derleme anı adlandırma: en dıştaki deyimin çıktı sütunlarına kaynak konumuyla camelCase takma ad ekler. Satır başına anahtar
 * dönüşümü yoktur; PostgreSQL satırları doğrudan camelCase adlarla döndürür. Kurallar: `README.md` (Output column names). */
import { AppError } from "../errors";

type Node = Record<string, unknown>;
type Span = { start: number; end: number };
type Edit = Span & { text: string };
/** Tablo adı → sütunlar; migration katlamasının (`foldTables(...).tables`) çıktısı. */
export type TableColumns = ReadonlyMap<string, readonly { readonly name: string }[]>;

export interface CasingInput {
  /** Yorumları maskelenmiş kaynak; konumlar özgün kaynakla aynıdır. */
  readonly parsedSource: string;
  readonly edits: Edit[];
  /** Yoksa gerçek tablolar üzerindeki `*` açılamaz ve reddedilir. */
  readonly tables?: TableColumns;
}

/** Görünür FROM öğesi: nitelendirici adı, (biliniyorsa) SQL sütun adları ve USING birleşimi olup olmadığı. */
interface Source {
  readonly visible: string;
  readonly columns: readonly string[] | null;
  readonly using: boolean;
}
/** CTE adı → SQL çıktı adları (bilinmiyorsa `null`). */
type Ctes = ReadonlyMap<string, readonly string[] | null>;
/** SQL adı → yeni çıktı adı; `alias`: açık takma addan mı geldiği. */
type Renamed = Map<string, { readonly name: string; readonly alias: boolean }>;
type Output = (sqlName: string, name: string, alias: boolean) => void;

function reject(detail: string): never {
  throw new AppError("SQL_UNSUPPORTED", `SQL_UNSUPPORTED: ${detail}`);
}

/** `first_name` → `firstName`; yalnızca küçük harf/rakam arasındaki alt çizgi kalkar, diğer adlar değişmez. */
export const camelCase = (name: string) => name.replace(/(?<=[a-z0-9])_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
const span = (node: Node) => (node._location as Span | undefined) ?? reject("missing source position");
const isStar = (expr: Node) => expr.type === "ref" && expr.name === "*";

/** Doğrulanmış çalışma anı deyiminin çıktı adlarını camelCase yapan kaynak düzenlemelerini `input.edits`'e ekler. */
export function aliasOutputColumns(statement: Node, input: CasingInput): void {
  aliasStatement(statement, new Map(), input);
}

/** En dıştaki deyim: WITH gövdesi, birleşimin ilk dalı veya DML'in RETURNING listesi. İç projeksiyonlara dokunulmaz. */
function aliasStatement(statement: Node, ctes: Ctes, input: CasingInput): Renamed {
  switch (statement.type) {
    case "with":
      return aliasStatement(statement.in as Node, withBindings(statement, ctes, input), input);
    case "select":
      return aliasSelect(statement, ctes, input);
    case "union":
    case "union all":
      return aliasUnion(statement, ctes, input);
    case "insert":
    case "update":
    case "delete":
      return aliasProjection((statement.returning as Node[] | undefined) ?? [], dmlSources(statement, ctes, input), input);
    default:
      return new Map();
  }
}

/** WITH bağlamaları sırayla kapsama girer; bağlama kendini değil, öncekileri görür. */
function withBindings(statement: Node, ctes: Ctes, input: CasingInput): Ctes {
  const scope = new Map(ctes);
  for (const binding of statement.bind as Node[])
    scope.set((binding.alias as Node).name as string, outputNames(binding.statement as Node, scope, input));
  return scope;
}

function aliasSelect(select: Node, ctes: Ctes, input: CasingInput): Renamed {
  const renamed = aliasProjection(select.columns as Node[], fromSources(select.from, ctes, input), input);
  const distinct = Array.isArray(select.distinct) ? (select.distinct as Node[]) : [];
  rewriteOutputRefs([...orderExprs(select), ...distinct], renamed, input);
  // GROUP BY çıplak adı önce girdi sütununa çözer: yeniden adlandırılan açık takma ada başvuru anlamını kaybederdi.
  for (const expr of (select.groupBy as Node[] | undefined) ?? [])
    if (bareOutput(expr, renamed)?.alias) reject(`GROUP BY ${String(expr.name)} refers to a renamed output alias; group by the expression or position, or quote the alias`);
  return renamed;
}

/** PostgreSQL çıktı adlarını ilk daldan alır. Parser birleşimin ORDER BY'ını son dala bağlar; parantezli dalınki ise o dalındır. */
function aliasUnion(union: Node, ctes: Ctes, input: CasingInput): Renamed {
  const renamed = aliasStatement(union.left as Node, ctes, input);
  let last = union.right as Node;
  while (last.type === "union" || last.type === "union all") last = last.right as Node;
  if (last.type === "select" && input.parsedSource[span(last).start] !== "(") rewriteOutputRefs(orderExprs(last), renamed, input);
  return renamed;
}

const orderExprs = (select: Node) => ((select.orderBy as Node[] | undefined) ?? []).map((order) => order.by as Node);
const bareOutput = (expr: Node, renamed: Renamed) =>
  expr.type === "ref" && expr.table === undefined ? renamed.get(expr.name as string) : undefined;

/** ORDER BY ve DISTINCT ON çıplak adı önce çıktı adına çözer: yeniden adlandırılan çıktıya başvuru yeni adla yazılır. */
function rewriteOutputRefs(exprs: readonly Node[], renamed: Renamed, input: CasingInput): void {
  for (const expr of exprs) {
    const output = bareOutput(expr, renamed);
    if (output) input.edits.push({ ...span(expr), text: quote(output.name) });
  }
}

/** Çıplak sütun `AS "ad"` alır, tırnaksız snake takma ad tırnaklı camelCase olur, tırnaklı takma ad aynen kalır, `*` gerekiyorsa
 * açık listeye genişler. Aynı çıktı adı iki kez reddedilir. */
function aliasProjection(columns: readonly Node[], sources: readonly Source[], input: CasingInput): Renamed {
  const renamed: Renamed = new Map();
  const seen = new Set<string>();
  const output: Output = (sqlName, name, alias) => {
    if (seen.has(name)) reject(`duplicate output column name "${name}"; alias one of the columns`);
    seen.add(name);
    if (name !== sqlName) renamed.set(sqlName, { name, alias });
  };
  for (const column of columns) {
    const expr = column.expr as Node;
    if (isStar(expr)) expandStar(expr, sources, input, output);
    else if (column.alias) renameAlias(column, input, output);
    else nameColumn(expr, input, output);
  }
  return renamed;
}

function renameAlias(column: Node, input: CasingInput, output: Output): void {
  const name = (column.alias as Node).name as string;
  const at = aliasSpan(column, input);
  // Tırnaklı takma ad kaçış yoludur: yazıldığı gibi kalır.
  if (input.parsedSource[at.start] === '"') return output(name, name, true);
  const camel = camelCase(name);
  if (camel !== name) input.edits.push({ ...at, text: quote(camel) });
  output(name, camel, true);
}

/** Takma adsız sütun (dönüşümler içinden) camelCase ad alır; diğer ifadeler PostgreSQL'in varsayılan adını korur. */
function nameColumn(expr: Node, input: CasingInput, output: Output): void {
  const column = columnName(expr);
  if (column === undefined) {
    const name = defaultName(expr);
    if (name !== undefined) output(name, name, false);
    return;
  }
  const camel = camelCase(column);
  if (camel !== column) {
    const end = expressionEnd(expr, input.parsedSource);
    input.edits.push({ start: end, end, text: ` AS ${quote(camel)}` });
  }
  output(column, camel, false);
}

/** `*` / `t.*` yalnızca en az bir sütunun adı değişiyorsa açık, nitelenmiş sütun listesine genişler; değişmiyorsa aynen kalır. */
function expandStar(ref: Node, sources: readonly Source[], input: CasingInput, output: Output): void {
  const columns =
    starColumns(ref, sources) ??
    reject("`*` needs columns known at compile time (migration tables, CTEs or subqueries with explicit projections, no USING joins); list the columns explicitly");
  for (const { name } of columns) output(name, camelCase(name), false);
  if (columns.every(({ name }) => camelCase(name) === name)) return;
  const list = columns.map(({ visible, name }) => `${quote(visible)}.${quote(name)}${camelCase(name) === name ? "" : ` AS ${quote(camelCase(name))}`}`);
  input.edits.push({ ...span(ref), text: list.join(", ") });
}

/** `*` açılımı (nitelendirici, SQL adı); sütunları bilinmeyen kaynak, bilinmeyen nitelendirici veya USING birleşimi `null`. */
function starColumns(ref: Node, sources: readonly Source[]) {
  const qualifier = (ref.table as Node | undefined)?.name;
  const selected = qualifier === undefined ? sources : sources.filter((source) => source.visible === qualifier);
  if (!selected.length || (qualifier === undefined && sources.some((source) => source.using))) return null;
  const columns: { visible: string; name: string }[] = [];
  for (const { visible, columns: names } of selected) {
    if (!names) return null;
    columns.push(...names.map((name) => ({ visible, name })));
  }
  return columns;
}

/** Deyimin PostgreSQL çıktı adları (takma ad eklenmeden önceki SQL adları); biri bilinmiyorsa `null`. Hata fırlatmaz. */
function outputNames(statement: Node, ctes: Ctes, input: CasingInput): readonly string[] | null {
  switch (statement.type) {
    case "with":
      return outputNames(statement.in as Node, withBindings(statement, ctes, input), input);
    case "select":
      return projectionNames(statement.columns as Node[], fromSources(statement.from, ctes, input));
    case "union":
    case "union all":
      return outputNames(statement.left as Node, ctes, input);
    case "insert":
    case "update":
    case "delete":
      return statement.returning ? projectionNames(statement.returning as Node[], dmlSources(statement, ctes, input)) : null;
    default:
      return null;
  }
}

function projectionNames(columns: readonly Node[], sources: readonly Source[]): readonly string[] | null {
  const names: string[] = [];
  for (const column of columns) {
    const expr = column.expr as Node;
    const found = isStar(expr)
      ? starColumns(expr, sources)?.map(({ name }) => name)
      : [((column.alias as Node | undefined)?.name as string | undefined) ?? defaultName(expr)];
    if (!found || found.includes(undefined)) return null;
    names.push(...(found as string[]));
  }
  return names;
}

/** Sütun başvurusunun adı (dönüşümler içinden; PostgreSQL de dönüşüme sütunun adını verir). */
function columnName(expr: Node): string | undefined {
  if (expr.type === "cast") return columnName(expr.operand as Node);
  return expr.type === "ref" && !isStar(expr) ? (expr.name as string) : undefined;
}

/** PostgreSQL'in takma adsız ifadeye verdiği ad: sütun, işlev veya zaman anahtar sözcüğü; diğerleri burada bilinmez. */
function defaultName(expr: Node): string | undefined {
  if (expr.type === "call") return (expr.function as Node).name as string;
  if (expr.type === "keyword") return expr.keyword as string;
  if (expr.type === "cast") return defaultName(expr.operand as Node);
  return columnName(expr);
}

/** FROM öğeleri: CTE, migration tablosu veya açık projeksiyonlu alt sorgu; sütun takma ad listesi ilk sütunları yeniden adlandırır. */
function fromSources(from: unknown, ctes: Ctes, input: CasingInput): Source[] {
  const items = from === undefined || from === null ? [] : ([from].flat() as Node[]);
  return items.map((item) => {
    const using = Array.isArray((item.join as Node | undefined)?.using);
    // FROM içi işlev: görünür ad takma addır; sütunlar yalnızca `AS e(a, b)` listesi verildiyse bilinir (aksi halde `*` reddedilir).
    if (item.type === "call") {
      const alias = item.alias as Node;
      const names = (alias.columns as Node[] | undefined)?.map((column) => column.name as string);
      return source(alias.name as string, names ?? null, undefined, using);
    }
    if (item.type === "statement") return source(item.alias as string, outputNames(item.statement as Node, ctes, input), item.columnNames, using);
    const relation = item.name as Node;
    const name = relation.name as string;
    const columns = ctes.has(name) ? (ctes.get(name) ?? null) : tableColumns(name, input);
    return source((relation.alias as string | undefined) ?? name, columns, relation.columnNames, using);
  });
}

/** DML hedefi her zaman gerçek tablodur; UPDATE ... FROM öğeleri de RETURNING'de görünür. */
function dmlSources(statement: Node, ctes: Ctes, input: CasingInput): Source[] {
  const target = (statement.type === "insert" ? statement.into : statement.type === "update" ? statement.table : statement.from) as Node;
  const name = target.name as string;
  const sources = [source((target.alias as string | undefined) ?? name, tableColumns(name, input), undefined, false)];
  return statement.type === "update" ? [...sources, ...fromSources(statement.from, ctes, input)] : sources;
}

const tableColumns = (name: string, input: CasingInput) => input.tables?.get(name)?.map((column) => column.name) ?? null;

function source(visible: string, columns: readonly string[] | null, aliases: unknown, using: boolean): Source {
  const names = aliases as Node[] | undefined;
  return { visible, using, columns: columns && names ? columns.map((column, i) => (names[i]?.name as string | undefined) ?? column) : columns };
}

/** Takma adın kaynak aralığı; parser `AS`'siz takma ada konum vermez: ifadenin bitişinden sonraki token okunur. */
function aliasSpan(column: Node, input: CasingInput): Span {
  const alias = column.alias as Node;
  if (alias._location) return alias._location as Span;
  const end = expressionEnd(column.expr as Node, input.parsedSource);
  const token = /^\s*("(?:[^"]|"")*"|[^\s,()"]+)/.exec(input.parsedSource.slice(end));
  const text = token?.[1];
  const name = text?.startsWith('"') ? text.slice(1, -1).replaceAll('""', '"') : text?.toLowerCase();
  if (!token || !text || name !== alias.name) reject("unsupported alias source position");
  const start = end + token[0].length - text.length;
  return { start, end: start + text.length };
}

/** İfadenin kaynakta bittiği yer: parser konumu sarmalayıcı parantezleri ve tip niteleyicisinin `)`'ını dışarıda bırakabilir. */
function expressionEnd(expr: Node, parsed: string): number {
  const { start, end } = span(expr);
  let depth = parenDepth(parsed.slice(start, end));
  for (let i = start - 1; i >= 0 && /[\s(]/.test(parsed[i] ?? ""); i--) if (parsed[i] === "(") depth++;
  if (depth < 0) reject("unsupported projection source position");
  let cursor = end;
  for (; depth > 0; depth--) {
    while (/\s/.test(parsed[cursor] ?? "")) cursor++;
    if (parsed[cursor] !== ")") reject("unsupported projection source position");
    cursor++;
  }
  return cursor;
}

/** Tırnaklı metin ve tanımlayıcıların dışındaki açık parantez farkı. */
function parenDepth(text: string): number {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "(") depth++;
    else if (char === ")") depth--;
    else if (char === "'" || char === '"') i = quoteEnd(text, i);
  }
  return depth;
}

/** `at`'taki tırnağın kapanış konumu; E'' metinlerinde ters eğik çizgi kaçış yapar. */
function quoteEnd(text: string, at: number): number {
  const mark = text[at];
  const escaped = mark === "'" && /(?:^|[^\w$])[eE]$/.test(text.slice(0, at));
  for (let i = at + 1; i < text.length; i++) {
    if (escaped && text[i] === "\\") i++;
    else if (text[i] === mark && text[i + 1] === mark) i++;
    else if (text[i] === mark) return i;
  }
  return text.length;
}
