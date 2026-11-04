/** Kabul edilen SQL alt kümesi: izinli AST alanları, türler, işlevler ve operatörler. */
/** Virgülle ayrılmış listeden küme. */
const commaSet = (items: string) => new Set(items.split(","));

// takma_ad=kanonik katalog adı; çıplak girdi zaten kanoniktir. Uzun saat dilimi/character varying takma adlarının parser
// konumları güvenilmez, char/character ise çıplak bpchar'ın aksine örtük uzunluk taşır: bu takma adlar desteklenmez.
// Üç sürücüde de string dönen ama dizi biçimi sürücüler arasında ayrışan (postgres.js ham metin verir) pg_catalog tipleri: yalnızca scalar.
const scalarOnlyList = "inet,cidr,macaddr,tsvector,tsquery,int4range,int8range,numrange,tsrange,tstzrange,daterange";
export const scalarOnly = commaSet(scalarOnlyList);
export const types: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    `uuid,text,boolean=bool,bool,smallint=int2,int2,integer=int4,int=int4,int4,bigint=int8,int8,real=float4,float4,double precision=float8,float8,numeric,decimal=numeric,varchar,bpchar,bytea,json,jsonb,date,time,timetz,timestamp,timestamptz,interval,${scalarOnlyList}`
      .split(",")
      .map((entry) => [entry.split("=")[0], entry.split("=").pop()]),
  ),
);
/** `serial` ailesi gerçek bir tip değil, CREATE TABLE/ADD COLUMN söz dizimidir: niteliksiz yazılır, PostgreSQL `int2/int4/int8` + sequence + varsayılana açar. */
export const serials: Readonly<Record<string, string>> = { smallserial: "int2", serial: "int4", bigserial: "int8" };
// Yerleşik işlev adları: agregalar, metin/sayı/tarih, JSON ve pencere işlevleri.
export const functions = new Set(
  `count sum avg min max
lower upper length char_length abs round ceil floor
now date_trunc date_part to_char gen_random_uuid split_part
json_agg jsonb_agg json_build_object jsonb_build_object array_agg string_agg
row_number rank dense_rank percent_rank cume_dist ntile
lag lead first_value last_value nth_value
unnest generate_series jsonb_set jsonb_each jsonb_each_text jsonb_array_elements jsonb_array_elements_text
jsonb_extract_path jsonb_extract_path_text concat replace btrim ltrim rtrim regexp_replace regexp_match regexp_matches array_length
to_tsvector to_tsquery plainto_tsquery websearch_to_tsquery ts_rank`.split(/\s+/),
);
// SQL söz diziminin çağırdığı gerçek işlev: `trim(x)` PostgreSQL'de `btrim(x)`'tir; `pg_catalog.trim` yoktur.
export const functionAliases: Readonly<Record<string, string>> = { trim: "btrim" };
// Bunlar schema'da çözülen işlevler değil, SQL sözdizimi biçimleridir.
export const specialCalls = commaSet("any,coalesce,nullif,greatest,least,exists,grouping,rollup,cube");
export const keywords = commaSet("current_date,current_time,current_timestamp,localtime,localtimestamp");
// İfade düğüm tipine göre onaylı operatörler; diğer operatörler reddedilir.
export const operators = new Map([
  ["binary", commaSet("OR,AND,IN,NOT IN,LIKE,NOT LIKE,ILIKE,NOT ILIKE,=,!=,>,>=,<,<=,+,-,*,/,%,||,@>,<@,?,?|,?&,#>>,~,~*,!~,!~*,@@,&&,<<,>>")],
  ["unary", commaSet("+,-,NOT,IS NULL,IS NOT NULL,IS TRUE,IS FALSE,IS NOT TRUE,IS NOT FALSE")],
  ["ternary", commaSet("BETWEEN,NOT BETWEEN")],
]);
/** Yerleşik index erişim yöntemleri (pg_am; schema'ya bağlı değildir). */
export const accessMethods = commaSet("btree,hash,gin,gist,brin");

const union = { type: null, left: "statement", right: "statement" } as const;
const literal = { type: null, value: null } as const;
const empty = { type: null } as const;
// `schema` yalnızca `pull`'un kaynak schema'sı olabilir; derleyici diğer her değeri reddeder.
const relation = { name: null, schema: null, alias: null, columnNames: "name" } as const;
const named = { type: null, constraintName: "name" } as const;
const primaryKey = { ...named, columns: "name" } as const;
// `nullsNotDistinct`: parser boşluğu (parser-gaps.ts) tarafından eklenir.
const unique = { ...primaryKey, nullsNotDistinct: null } as const;
// Identity sütunu; `GENERATED ALWAYS AS (ifade) STORED` (`expression`, `stored`) listede olmadığı için reddedilir.
const generated = { type: null, always: null, constraintName: "name", sequence: "identity" } as const;
const dataType = { array: { kind: null, arrayOf: "dataType" }, "*": { name: null, schema: null, doubleQuoted: null, config: null } } as const;
const withStatement = { type: null, bind: "binding", in: "statement", recursive: null } as const;
const reference = { ...named, foreignTable: "target", foreignColumns: "name", localColumns: "name", onDelete: null, onUpdate: null, match: null } as const;
const drop = { type: null, names: "target", ifExists: null, cascade: null } as const;
// Veri migration'ları (ve seed'ler) runtime ile aynı DML kurallarını kullanır.
const dml = {
  insert: { type: null, into: "target", columns: "name", insert: "statement", returning: "selected", onConflict: "conflict" },
  update: { type: null, table: "target", sets: "set", where: "expr", from: "from", returning: "selected" },
  delete: { type: null, from: "target", where: "expr", returning: "selected" },
} as const;

/**
 * Düğüm türü → düğüm `type`'ı (veya `kind`'ı) → izinli alanlar ve her çocuğun türü (`null` = yaprak değer). `"*"` her tiple
 * eşleşir. Listede olmayan tipler ve alanlar reddedilir; çocuklar burada listelenen sırayla gezilir.
 */
export const grammar = {
  statement: {
    select: { type: null, columns: "selected", from: "from", where: "expr", groupBy: "expr", having: "expr", limit: "limit", orderBy: "order", distinct: null, for: "lock", skip: "skip" },
    // WITH bir kapsam açar; her bağlama kendi gövdesinden sonra kapsama katılır.
    with: withStatement,
    union,
    "union all": union,
    values: { type: null, values: "expr" },
    ...dml,
  },
  binding: { "*": { statement: "statement", alias: "name" } },
  expr: {
    ref: { type: null, name: null, table: "name" },
    parameter: { type: null, name: null },
    string: literal,
    integer: literal,
    numeric: literal,
    boolean: literal,
    null: empty,
    default: empty,
    constant: { type: null, dataType: "dataType", value: null },
    cast: { type: null, operand: "expr", to: "dataType" },
    call: { type: null, function: "function", args: "expr", distinct: null, orderBy: "order", filter: "expr", withinGroup: "order", over: "over" },
    binary: { type: null, left: "expr", right: "expr", op: null },
    // `->` / `->>`: parser anahtarı yalnızca sabit metin/sayı olarak verir (`data->$1` ayrıştırılamaz).
    member: { type: null, operand: "expr", op: null, member: null },
    unary: { type: null, operand: "expr", op: null },
    list: { type: null, expressions: "expr" },
    array: { type: null, expressions: "expr" },
    "array select": { type: null, select: "statement" },
    arrayIndex: { type: null, array: "expr", index: "expr" },
    case: { type: null, value: "expr", whens: "when", else: "expr" },
    ternary: { type: null, value: "expr", lo: "expr", hi: "expr", op: null },
    keyword: { type: null, keyword: null },
    // EXTRACT(alan FROM ifade): PostgreSQL bunu her zaman pg_catalog.extract olarak çözer; alan bir anahtar kelimedir.
    extract: { type: null, field: "name", from: "expr" },
  },
  from: {
    table: { type: null, name: "relation", join: "join" },
    statement: { type: null, statement: "statement", alias: null, columnNames: "name", join: "join", lateral: null },
    // FROM içinde tablo döndüren işlev; takma ad zorunludur (derleyici denetler). Sütun listesi `alias.columns`'tadır.
    call: { type: null, function: "function", args: "expr", alias: "callAlias", lateral: null, join: "join" },
  },
  name: { "*": { name: null } },
  callAlias: { "*": { name: null, columns: "name" } },
  // İlişkiler bir CTE'ye veya uygulama schema'sına, hedefler her zaman uygulama schema'sına çözülür.
  relation: { "*": relation },
  target: { "*": relation },
  dataType,
  columnType: dataType,
  function: { "*": { name: null, schema: null } },
  selected: { "*": { expr: "expr", alias: "name" } },
  order: { "*": { by: "expr", order: null, nulls: null } },
  limit: { "*": { limit: "expr", offset: "expr" } },
  join: { "*": { type: null, on: "expr", using: "name" } },
  set: { "*": { column: "name", value: "expr" } },
  when: { "*": { when: "expr", value: "expr" } },
  conflict: { "*": { on: "conflictTarget", do: null, where: "expr" } },
  conflictTarget: { "on expr": { type: null, exprs: "expr" }, "on constraint": { type: null, constraint: "name" } },
  conflictUpdate: { "*": { sets: "set" } },
  over: { "*": { partitionBy: "expr", orderBy: "order" } },
  lock: { update: empty, "no key update": empty, share: empty, "key share": empty },
  skip: { nowait: empty, "skip locked": empty },
  migration: {
    "create table": { type: null, name: "target", ifNotExists: null, columns: "column", constraints: "constraint" },
    "alter table": { type: null, table: "target", ifExists: null, changes: "change" },
    "create index": { type: null, table: "target", indexName: "name", expressions: "indexExpr", where: "expr", unique: null, concurrently: null, ifNotExists: null, using: "accessMethod" },
    "drop table": drop,
    "drop index": { ...drop, concurrently: null },
    // Enum tipleri uygulama schema'sında oluşur; sonraki başvurular derleyicide o schema'ya bağlanır.
    "create enum": { type: null, name: "target", values: null },
    "drop type": drop,
    "alter index": { type: null, index: "target", ifExists: null, change: "indexChange" },
    // Yalnızca ADD VALUE; `ifNotExists`/`before`/`after` parser boşluğu tarafından eklenir.
    "alter enum": { type: null, name: "target", change: "enumChange" },
    // Veri migration'ı: runtime ile aynı WITH kuralları.
    with: withStatement,
    ...dml,
  },
  column: { column: { kind: null, name: "name", dataType: "columnType", constraints: "constraint" } },
  constraint: {
    "primary key": primaryKey,
    unique,
    "add generated": generated,
    "not null": named,
    null: named,
    default: { ...named, default: "expr" },
    check: { ...named, expr: "expr" },
    reference,
    "foreign key": reference,
  },
  // Sequence adı niteliksiz yazılsa da tablo schema'sında oluşur; derleyici yine de bağlanan schema'yı açıkça yazar. `OWNED BY` reddedilir.
  identity: { "*": { name: "target", as: "dataType", incrementBy: null, minValue: null, maxValue: null, startWith: null, cache: null, cycle: null } },
  indexExpr: { "*": { expression: "expr", collate: "collation", order: null, nulls: null } },
  accessMethod: { "*": { name: null } },
  // Yalnızca niteliksiz; derleyici pg_catalog collation'ı olarak yazar.
  collation: { "*": { name: null } },
  change: {
    "add column": { type: null, ifNotExists: null, column: "column" },
    "drop column": { type: null, ifExists: null, column: "name", behaviour: null },
    rename: { type: null, to: "name" },
    "rename column": { type: null, column: "name", to: "name" },
    "rename constraint": { type: null, constraint: "name", to: "name" },
    "alter column": { type: null, column: "name", alter: "alterColumn" },
    "add constraint": { type: null, constraint: "constraint" },
    "drop constraint": { type: null, ifExists: null, constraint: "name", behaviour: null },
  },
  alterColumn: {
    // `using`: parser boşluğu tarafından ayrıca ayrıştırılan dönüşüm ifadesi.
    "set type": { type: null, dataType: "dataType", using: "expr" },
    "add generated": generated,
    "set default": { type: null, default: "expr" },
    "drop default": empty,
    "set not null": empty,
    "drop not null": empty,
  },
  indexChange: { rename: { type: null, to: "name" } },
  enumChange: { "add value": { type: null, add: "enumValue", ifNotExists: null, before: null, after: null } },
  enumValue: { "*": { value: null } },
} as const;
