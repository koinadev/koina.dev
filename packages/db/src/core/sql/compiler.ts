/** AST kapsamını doğrular; yalnızca gerçek ilişkiler ve güvenli yerleşikler için kaynak düzenlemesi üretir. Yorum sınırlarını bulur
 * ve yorum içine gizlenen ifadeleri engeller. Kaynak SQL'i derleyen girişler (`prepareQuery`, `prepareMigration`): codegen,
 * migration ve testler kullanır; runtime yüklemez. */
import { parse, type Statement } from "pgsql-ast-parser";
import { AppError } from "../errors";
import { aliasOutputColumns, type TableColumns } from "./casing";
import { accessMethods, types as builtinTypes, functionAliases, functions, grammar, keywords, operators, scalarOnly, serials, specialCalls } from "./grammar";
import { attachParserGaps, findParserGaps } from "./parser-gaps";
import { bindParts, defineQuery, type PreparedQuery } from "./query";

type Kind = keyof typeof grammar;
type Rules = Readonly<Record<string, Kind | null>>;
// Grammar'da adı geçen her çocuk türünün var olduğunu da tip düzeyinde denetler.
const table: Readonly<Record<Kind, Readonly<Record<string, Rules>>>> = grammar;
type Node = Record<string, unknown>;
type Span = { start: number; end: number };
/** `strip`: yalnızca `unqualifyMigration` çıktısına uygulanan kaynak schema silme düzenlemesi. */
type Edit = Span & { text: string; strip?: boolean };
// Schema'nın ekleneceği yeri işaretler; NUL içeren kaynak reddedilir.
const SCHEMA = "\0";
// Alt sorgular ifade olarak ayrıştırılır ama deyim olarak gezilir.
const subqueries = new Set(["select", "with", "union", "union all", "values"]);

interface Compiled {
  readonly parts: readonly string[];
  readonly requiresTransaction: boolean;
  readonly readOnly: boolean;
  /** Ayrıştırılmış deyim: registry concurrent index'i, codegen tablo şeklini buradan türetir. */
  readonly ast: Statement;
}

/** Tek bir `compile` çağrısının gezinti durumu. */
interface Context {
  readonly source: string;
  /** Yorumları maskelenmiş kaynak (konumlar aynı). */
  readonly parsedSource: string;
  readonly migration: boolean;
  /** Migration'da oluşturulmuş enum tipleri; `CREATE TYPE … AS ENUM` / `DROP TYPE` ile güncellenir. */
  readonly types: Set<string>;
  /** Aynı migration bölümünde oluşturulmuş `table:ad` / `type:ad`: `DROP … CASCADE` yalnızca bunlarda kabul edilir. */
  readonly created: Set<string>;
  /** Yalnızca `pull`: niteliği kaldırılacak kaynak schema'lar; yoksa her açık schema reddedilir. */
  readonly sourceSchemas?: ReadonlySet<string>;
  readonly edits: Edit[];
  requiresTransaction: boolean;
  /** Doğrudan `GROUP BY` öğesi olan `ROLLUP`/`CUBE` çağrıları: başka yerdeki aynı adlı çağrı fonksiyon sayılmaz. */
  readonly groupings: Set<Node>;
}

export function unsupported(detail: string): never {
  throw new AppError("SQL_UNSUPPORTED", `SQL_UNSUPPORTED: ${detail}`);
}

/** Satır yorumunun sonundaki satır sonu konumu (satır sonu yoruma dahil değildir). */
function skipLineComment(source: string, cursor: number): number {
  while (cursor < source.length && !/[\r\n]/.test(source[cursor] ?? "")) cursor++;
  return cursor;
}

/** İç içe blok yorumunun bittiği konum; kapanmayan yorum reddedilir. */
function skipBlockComment(source: string, cursor: number): number {
  cursor += 2;
  let depth = 1;
  while (cursor < source.length && depth > 0) {
    const delimiter = source.slice(cursor, cursor + 2);
    if (delimiter === "/*" || delimiter === "*/") {
      depth += delimiter === "/*" ? 1 : -1;
      cursor += 2;
    } else cursor++;
  }
  if (depth) unsupported("unterminated block comment");
  return cursor;
}

/** `quoteAt` konumundaki tırnaklı metnin/tanımlayıcının bittiği konum; kapanmayan tırnak reddedilir. */
function skipQuoted(source: string, quoteAt: number, escaped: boolean): number {
  const quote = source[quoteAt];
  let cursor = quoteAt + 1;
  while (cursor < source.length) {
    // Sıradan metinler standard_conforming_strings=on kuralına uyar; ters eğik çizgi yalnızca E'' metinlerinde kaçış yapar.
    if (escaped && source[cursor] === "\\") cursor += 2;
    else if (source[cursor] !== quote) cursor++;
    else if (source[cursor + 1] === quote) cursor += 2;
    else return cursor + 1;
  }
  return unsupported("unterminated quoted SQL token");
}

/** Yorumları parser'dan gizler; UTF-16 kaynak konumları değişmez. */
export function maskSqlComments(source: string): string {
  const masked = source.split("");
  let cursor = 0;
  while (cursor < source.length) {
    const start = cursor;
    const pair = source.slice(cursor, cursor + 2);
    if (pair === "--" || pair === "/*") {
      cursor = pair === "--" ? skipLineComment(source, cursor) : skipBlockComment(source, cursor);
      for (let i = start; i < cursor; i++) if (source[i] !== "\r" && source[i] !== "\n") masked[i] = " ";
      continue;
    }
    // Desteklenen grammar dolar/Unicode kaçışlı tırnaklamayı modellemez: içeriğini okumak yerine güvenli tarafta reddet.
    if ((pair[0] === "$" && /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.test(source.slice(cursor))) || /^[uU]&['"]/.test(source.slice(cursor, cursor + 3)))
      unsupported("unsupported SQL quoting syntax");
    const escaped = (pair === "E'" || pair === "e'") && (cursor === 0 || !/[A-Za-z0-9_$\u0080-\uffff]/.test(source[cursor - 1] ?? ""));
    const quoteAt = escaped ? cursor + 1 : cursor;
    if (source[quoteAt] === "'" || source[quoteAt] === '"') cursor = skipQuoted(source, quoteAt, escaped);
    else cursor++;
  }
  return masked.join("");
}

/** `tables`: migration tabloları; codegen ile aynı `*` açılımı için gerekir (yoksa gerçek tablo üzerindeki `*` reddedilir). */
export function prepareQuery(source: string, tables?: TableColumns): PreparedQuery {
  const { parts, requiresTransaction, readOnly } = compile(source, false, undefined, tables)[0] as Compiled;
  return defineQuery(parts, requiresTransaction, readOnly);
}
/** `bind(schema)`: migration'ın çalışacağı schema. `types`: önceki migration'ların enum tipleri; bu kaynaktaki
 * `CREATE TYPE … AS ENUM` / `DROP TYPE` ile güncellenir (registry sırayla aynı kümeyi geçirir). `created`: aynı bölümün önceki
 * parçalarında oluşturulan tablo/tipler (registry her bölümü tek parça derler). */
export function prepareMigration(source: string, types = new Set<string>(), created = new Set<string>()) {
  const statements = compile(source, true, types, undefined, created);
  return Object.freeze({
    statements: statements.map((statement) => statement.ast),
    bind: (schema: string): readonly string[] => Object.freeze(statements.map(({ parts }) => bindParts(parts, schema))),
  });
}

/** `pull`: `sourceSchemas` niteliklerinin silindiği kaynak ve (nitelikleri koruyan) AST. Diğer denetimler
 * `prepareMigration` ile aynıdır; verilen `types`/`created` kümeleri değişmez. */
export function unqualifyMigration(source: string, sourceSchemas: ReadonlySet<string>, types: ReadonlySet<string>, created: ReadonlySet<string>) {
  const { statements, context } = analyze(source, true, new Set(types), undefined, { created: new Set(created), sourceSchemas });
  const strips = context.edits.filter((edit) => edit.strip);
  return { source: applyEdits(source, context.parsedSource, strips, 0, source.length), statements: statements as unknown as Statement[] };
}

function location(node: Node): Span {
  const span = node._location as Span | undefined;
  if (!span || span.start >= span.end) unsupported("missing source position");
  return span;
}

function identifier(value: unknown): string {
  if (typeof value !== "string" || !value || new TextEncoder().encode(value).length > 63) unsupported("identifier must contain 1–63 UTF-8 bytes");
  return value;
}

/** Ad ve (varsa) takma ad tanımlayıcı kurallarına uymalı. */
function checkedName(node: Node): string {
  const name = identifier(node.name);
  if (node.alias !== undefined) identifier(node.alias);
  return name;
}

/** AST token sınırına schema işareti ekler; SQL metnindeki bir işaret asla değiştirilmez. */
function qualifyWithSchema(node: Node, context: Context): void {
  const { start } = location(node);
  context.edits.push({ start, end: start, text: `${SCHEMA}.` });
}

/** Açık schema yalnızca `pull`'un kaynak schema'sıysa kabul edilir: `schema.` öneki çıktıdan silinir, ad bağlanan
 * schema'ya çözülür. Diğer her schema (`public`, `pg_catalog` ilişkileri …) reddedilir. */
function stripSourceSchema(node: Node, context: Context): void {
  if (node.schema === undefined) return;
  if (!context.sourceSchemas?.has(String(node.schema))) unsupported(`explicit schema qualification: ${String(node.schema)}`);
  const { start } = location(node);
  const prefix = /^(?:"(?:[^"]|"")*"|[^\s."]+)\s*\.\s*/.exec(context.parsedSource.slice(start));
  if (!prefix) unsupported("missing schema source position");
  context.edits.push({ start, end: start + prefix[0].length, text: "", strip: true });
}

function checkDataType(node: Node, context: Context, column = false): void {
  // Sabitlenmiş parser dizi elemanı niteleyicilerini kaynak aralığından çıkarır: iki kez yazmak yerine reddet.
  if (node.kind === "array") {
    if ((node.arrayOf as Node).config !== undefined) unsupported("array type modifiers are unsupported");
    // Yeni tiplerin dizi biçimi sürücüler arasında ayrışır (postgres.js ham metin döndürür): yalnızca scalar.
    let element = node.arrayOf as Node;
    while (element.kind === "array") element = element.arrayOf as Node;
    if (scalarOnly.has(String(element.name)))
      unsupported(`${String(element.name)} arrays are unsupported (drivers disagree on their value shape); use a scalar column, ::text or JSON`);
    return;
  }
  const name = identifier(node.name);
  // serial gerçek bir tip değil, sütun tanımı söz dizimidir: yalnızca çıplak, niteliksiz ve sütunda; yazıldığı gibi kalır.
  if (column && Object.hasOwn(serials, name) && node.schema === undefined && !node.doubleQuoted && node.config === undefined) return;
  if (node.schema !== "pg_catalog") stripSourceSchema(node, context);
  const schema = node.schema === "pg_catalog" ? "pg_catalog" : undefined;
  const canonical = Object.hasOwn(builtinTypes, name) ? builtinTypes[name] : undefined;
  // Migration'da oluşturulmuş enum: her zaman bağlanan schema'ya nitelenir (oturumun ad çözümüne bırakılmaz).
  if (!canonical && context.migration && context.types.has(name) && schema === undefined && node.config === undefined) {
    context.edits.push({ ...location(node), text: `${SCHEMA}."${name.replaceAll('"', '""')}"` });
    return;
  }
  if (!canonical || (node.doubleQuoted && canonical !== name)) unsupported(`unsupported type: ${name}`);
  const config = node.config as number[] | undefined;
  if (config?.some((n) => !Number.isSafeInteger(n) || n < 0)) unsupported("invalid type modifier");
  // Çıplak INTERVAL zaten SystemTypeName kullanır; nitelemek hassasiyeti farklı bir genel tip niteleyicisine çevirir.
  if (name === "interval" && !node.doubleQuoted && schema === undefined) return;
  const { start, end } = location(node);
  // Skaler niteleyici aralıkları ')' olmadan son argümanda biter: tam o ayracı tüket, token'lar arasında asla tahmin yürütme.
  const missingParen = config?.length && context.source[end - 1] !== ")";
  if (missingParen && context.source[end] !== ")") unsupported("unsupported type modifier source position");
  // Kanonik yerleşik adı yazar; tip araması oturumun ad çözümüne bağlı kalmaz.
  context.edits.push({
    start,
    end: missingParen ? end + 1 : end,
    text: `"pg_catalog"."${canonical}"${config?.length ? `(${config.join(",")})` : ""}`,
  });
}

type SemanticCheck = (node: Node, type: string, context: Context, scope: Set<string>) => void;

/** Alan tablosunun ifade edemediği, düğüm türüne göre anlamsal denetimler ve kaynak düzenlemeleri. */
const isGroupingCall = (node: Node) => node.type === "call" && ["rollup", "cube"].includes(String((node.function as Node).name));

const SEMANTIC_CHECKS: Partial<Record<Kind, SemanticCheck>> = {
  name: (node) => {
    checkedName(node);
  },
  // İlişki bir CTE'ye veya uygulama schema'sına, hedef her zaman uygulama schema'sına çözülür.
  relation: (node, _type, context, scope) => {
    stripSourceSchema(node, context);
    const name = checkedName(node);
    // Niteliği silinen ad aynı adlı CTE'ye çözülürdü: anlam değişeceği için reddet.
    if (node.schema !== undefined && scope.has(name)) unsupported(`schema-qualified relation ${name} would resolve to a CTE`);
    if (!scope.has(name)) qualifyWithSchema(node, context);
  },
  target: (node, _type, context) => {
    stripSourceSchema(node, context);
    checkedName(node);
    qualifyWithSchema(node, context);
  },
  binding: (node, _type, _context, scope) => {
    scope.add((node.alias as Node).name as string);
  },
  dataType: (node, _type, context) => checkDataType(node, context),
  columnType: (node, _type, context) => checkDataType(node, context, true),
  // Yerleşik collation, tipler gibi nitelenmiş yazılır; tırnaklama büyük/küçük harfi korur.
  collation: (node, _type, context) => {
    context.edits.push({ ...location(node), text: `"pg_catalog"."${identifier(node.name).replaceAll('"', '""')}"` });
  },
  function: (node, _type, context) => {
    const name = identifier(node.name);
    const alias = Object.hasOwn(functionAliases, name) && node.schema === undefined ? functionAliases[name] : undefined;
    if (specialCalls.has(name) && node.schema === undefined) {
      const span = location(node);
      // `GROUPING SETS` parser kopyasında `ROLLUP` olarak yerine konur (parser-gaps.ts); özgün metinde iki sözcüktür.
      const groupingSets = name === "rollup" && /^grouping\s+sets(?![\w$])/i.test(context.source.slice(span.start));
      if (!groupingSets && context.source.slice(span.start, span.end).toLowerCase() !== name) unsupported("quoted SQL syntax is not an allowed function");
    } else if (alias === undefined && (!functions.has(name) || (node.schema !== undefined && node.schema !== "pg_catalog"))) unsupported(`unsupported function: ${name}`);
    else {
      const span = location(node);
      // `trim(x)` yalnızca çıplak yazılırsa söz dizimidir; tırnaklı "trim" gerçek bir işlev adıdır ve yoktur.
      if (alias !== undefined && context.source.slice(span.start, span.end).toLowerCase() !== name) unsupported("quoted SQL syntax is not an allowed function");
      context.edits.push({ ...span, text: `"pg_catalog"."${alias ?? name}"` });
    }
  },
  accessMethod: (node) => {
    if (!accessMethods.has(String(node.name))) unsupported(`unsupported index method: ${String(node.name)}`);
  },
  lock: (_node, _type, context) => {
    context.requiresTransaction = true;
  },
  conflict: (node, _type, context, scope) => {
    if (node.do !== "do nothing") walk(context, node.do, "conflictUpdate", scope);
  },
  from: (node, type) => {
    if (type === "statement") identifier(node.alias);
    if (type === "call" && !node.alias) unsupported("a function in FROM needs an alias");
    // rollup/cube/grouping özel çağrıdır (nitelenmez); FROM'da fonksiyon gibi yazılırsa nitelemesiz bir ada çözülür.
    if (type === "call" && specialCalls.has(identifier((node.function as Node).name))) unsupported("a special call is not a table function");
  },
  callAlias: (node) => {
    checkedName(node);
  },
  expr: (node, type, context) => {
    if (type === "ref" && node.name !== "*") identifier(node.name);
    if (type === "parameter" && !/^\$[1-9][0-9]*$/.test(String(node.name))) unsupported("invalid parameter");
    if (operators.get(type)?.has(String(node.op)) === false) unsupported("unsupported operator");
    if (isGroupingCall(node) && !context.groupings.has(node)) unsupported("ROLLUP, CUBE and GROUPING SETS are allowed only directly in GROUP BY");
    if (type === "keyword" && !keywords.has(String(node.keyword))) unsupported("unsupported SQL keyword");
  },
};

const createdKey = (kind: "table" | "type", target: unknown) => `${kind}:${String((target as Node).name)}`;

/** Bölümde oluşturulan tablo/tipleri izler. Bölüm tek transaction'da çalışır: henüz commit edilmemiş nesneye başka bir schema'dan
 * bağımlılık kurulamaz, bu yüzden `DROP TABLE|TYPE … CASCADE` yalnızca bu nesnelerde kabul edilir. */
function trackCreated(node: Node, type: string, context: Context): void {
  const { created } = context;
  if (type === "create table") created.add(createdKey("table", node.name));
  else if (type === "create enum") created.add(createdKey("type", node.name));
  else if (type === "alter table") {
    for (const change of node.changes as Node[])
      if (change.type === "rename" && created.delete(createdKey("table", node.table))) created.add(createdKey("table", change.to));
  } else if (type === "drop table" || type === "drop type") {
    for (const target of node.names as Node[]) {
      const own = created.delete(createdKey(type === "drop table" ? "table" : "type", target));
      if (node.cascade === "cascade" && !own) unsupported("CASCADE is only allowed for objects created earlier in the same migration section");
    }
  }
}

/** Türüne göre denetimi olmayan düğümlerde `type`'a bağlı denetimler: enum tipleri, oluşturulan nesneler ve SELECT kilit kuralları. */
function checkByType(node: Node, type: string, context: Context, scope: Set<string>): void {
  if (context.migration) trackCreated(node, type, context);
  if (type === "create enum" || type === "drop type") {
    for (const target of type === "create enum" ? [node.name as Node] : (node.names as Node[])) {
      const name = target.name as string;
      if (Object.hasOwn(builtinTypes, name)) unsupported(`type name shadows a builtin: ${name}`);
      if (type === "create enum") context.types.add(name);
      else context.types.delete(name);
    }
  } else if (type === "select") {
    if (Array.isArray(node.distinct)) walk(context, node.distinct, "expr", scope);
    if (node.skip && !node.for) unsupported("lock wait policy requires FOR");
  }
}

/** Düğüm türü ve tipine uyan izinli alanlar; listede olmayan tip veya alan reddedilir. */
function allowedFields(node: Node, kind: Kind, type: string): Rules {
  const variants = table[kind];
  const rules = Object.hasOwn(variants, type) ? variants[type] : variants["*"];
  if (!rules) unsupported(`unsupported ${kind}: ${type}`);
  for (const key of Object.keys(node)) if (key !== "_location" && !Object.hasOwn(rules, key)) unsupported(`unsupported ${kind} field: ${key}`);
  return rules;
}

/** Önce çocukları grammar sırasıyla gezer, sonra düğümün anlamsal denetimini çalıştırır. */
function walk(context: Context, value: unknown, kind: Kind, scope: Set<string>): void {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    for (const item of value) walk(context, item, kind, scope);
    return;
  }
  if (typeof value !== "object") unsupported(`invalid ${kind}`);
  const node = value as Node;
  const type = String(node.type ?? node.kind);
  if (kind === "expr" && subqueries.has(type)) kind = "statement";
  const rules = allowedFields(node, kind, type);
  // WITH yeni bir kapsam açar; her bağlama kendi gövdesinden sonra kapsama katılır. RECURSIVE'de tüm bağlamalar gövdelerde görünür.
  if (type === "with") {
    scope = new Set(scope);
    if (node.recursive) for (const binding of node.bind as Node[]) scope.add((binding.alias as Node).name as string);
  }
  // Yalnızca `GROUP BY` / `,` hemen önündeyse doğrudan öğedir: `GROUP BY (rollup(a))` parantezli düz ifadedir ve fonksiyon gibi çözülür.
  if (type === "select")
    for (const item of (node.groupBy as Node[] | undefined) ?? [])
      if (isGroupingCall(item) && /(?:\bBY|,)\s*$/i.test(context.parsedSource.slice(0, location(item).start))) context.groupings.add(item);
  for (const [key, child] of Object.entries(rules)) if (child) walk(context, node[key], child, scope);
  const check = SEMANTIC_CHECKS[kind];
  if (check) check(node, type, context, scope);
  else checkByType(node, type, context, scope);
  // DROP TABLE/TYPE CASCADE kuralı trackCreated'dadır; sütun/kısıt/index CASCADE her zaman reddedilir.
  const ownCascadeRule = type === "drop table" || type === "drop type";
  if ((node.cascade === "cascade" && !ownCascadeRule) || node.behaviour === "cascade") unsupported("CASCADE may affect other schemas");
}

function parseStatements(parsedSource: string, migration: boolean): Node[] {
  let statements: Node[];
  try {
    statements = parse(parsedSource, { locationTracking: true }) as unknown as Node[];
  } catch {
    return unsupported("SQL could not be parsed by the supported PostgreSQL grammar");
  }
  if (!statements.length || (!migration && statements.length !== 1)) unsupported("expected one runtime statement or a nonempty migration");
  return statements;
}

/** AST deyim bitişleri kapanış parantezini atlayabilir: sınır bir sonraki deyimin başlangıcıdır. */
function statementBounds(statements: readonly Node[], index: number, sourceLength: number): Span {
  const next = statements[index + 1];
  const start = index === 0 ? 0 : location(statements[index] as Node).start;
  const end = next ? location(next).start : sourceLength;
  return { start, end };
}

/** `[start, end)` aralığındaki sıralı düzenlemeleri kaynağa uygular; kaynağın sonundaki ekleme (ör. son RETURNING takma adı) son deyime aittir. */
function applyEdits(source: string, parsedSource: string, edits: readonly Edit[], start: number, end: number): string {
  let sql = "";
  let cursor = start;
  for (const edit of edits) {
    if (edit.start < start || edit.start > end || (edit.start === end && end < source.length)) continue;
    if (edit.start < cursor) unsupported("overlapping AST source edits");
    sql += source.slice(cursor, edit.start) + edit.text;
    // Kanonik tip/işlev aralıkları yorum içerebilir: boşluklarını (satır yorumu sonlandırıcıları dahil) koru.
    if (source.slice(edit.start, edit.end) !== parsedSource.slice(edit.start, edit.end))
      for (let i = edit.start; i < edit.end; i++) if (/\s/.test(parsedSource[i] ?? "")) sql += source[i];
    cursor = edit.end;
  }
  return sql + source.slice(cursor, end);
}

type MigrationState = Pick<Context, "created" | "sourceSchemas">;

/** Ayrıştırır (migration'da parser boşluklarını bağlayarak), grammar'ı gezer ve sıralı kaynak düzenlemelerini toplar. */
function analyze(source: string, migration: boolean, types: Set<string>, tables: TableColumns | undefined, state: MigrationState) {
  if (source.includes(SCHEMA)) unsupported("NUL in SQL source");
  const parsedSource = maskSqlComments(source);
  const gaps = findParserGaps(parsedSource);
  const statements = parseStatements(gaps.parsable, migration);
  attachParserGaps(statements, gaps, parsedSource);
  const context: Context = { source, parsedSource, migration, types, ...state, edits: [], requiresTransaction: false, groupings: new Set() };
  for (const statement of statements) walk(context, statement, migration ? "migration" : "statement", new Set());
  // Çıktı adları yalnızca doğrulanmış çalışma anı sorgusunda değişir; migration/seed DML'i ve iç projeksiyonlar aynen kalır.
  if (!migration) aliasOutputColumns(statements[0] as Node, { parsedSource, edits: context.edits, tables });
  context.edits.sort((a, b) => a.start - b.start);
  return { statements, context };
}

/** Çalışma anı sorgusu yalnızca okuyorsa `true`: üst düzey SELECT/VALUES/UNION, kilitsiz (`FOR …` yok) ve her CTE gövdesi de okuma.
 * Yan etkili fonksiyonlar (`nextval` gibi) statik ayrılamaz; replica yazıyı kendisi reddeder; primary okuması (replica yok ya da yazıdan sonra) tek deyimdir. */
function readsOnly(node: Node): boolean {
  switch (node.type) {
    case "select":
      return !node.for;
    case "values":
      return true;
    case "union":
    case "union all":
      return readsOnly(node.left as Node) && readsOnly(node.right as Node);
    case "with":
      return (node.bind as { statement: Node }[]).every((binding) => readsOnly(binding.statement)) && readsOnly(node.in as Node);
    default:
      return false;
  }
}

/** `tables`: yalnızca çalışma anı sorgularında, en dıştaki `*`'ı camelCase çıktı adları için açmakta kullanılır (`casing.ts`).
 * `created`: migration bölümünde daha önce oluşturulan tablo/tipler (CASCADE kuralı). */
export function compile(
  source: string,
  migration: boolean,
  types = new Set<string>(),
  tables?: TableColumns,
  created = new Set<string>(),
): readonly Compiled[] {
  const { statements, context } = analyze(source, migration, types, tables, { created });
  return Object.freeze(
    statements.map((statement, index) => {
      const { start, end } = statementBounds(statements, index, source.length);
      const parts = Object.freeze(applyEdits(source, context.parsedSource, context.edits, start, end).split(SCHEMA));
      return Object.freeze({ parts, requiresTransaction: context.requiresTransaction, readOnly: readsOnly(statement as unknown as Node), ast: statement as unknown as Statement });
    }),
  );
}
