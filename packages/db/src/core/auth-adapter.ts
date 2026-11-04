/** Better Auth veritabanı bağdaştırıcısı: `createAdapterFactory` üzerinde, motorun sorgu yolunda (`query` / `transaction`) çalışan küçük
 * bir SQL üreticisi. Her tablo `"<schema>"."<tablo>"` olarak nitelenir, her değer `$n` parametresidir; oturum durumu kullanılmaz.
 * Tablo ve sütun adları Better Auth `modelName` / `fields` eşlemesinden gelir (`auth-schema.ts`); schema bağdaştırıcıya
 * `engineAdapter(db, schema)` ile verilir.
 *
 * - Operatörler: `eq`, `ne`, `lt`, `lte`, `gt`, `gte`, `in`, `not_in`, `contains`, `starts_with`, `ends_with`; `AND` koşulları ve tek
 *   bir `OR` grubu (`(a AND b) AND (c OR d)`, Kysely bağdaştırıcısıyla aynı). `mode: "insensitive"`: `lower()` / `ILIKE`.
 * - `consumeOne` ve `incrementOne` tek deyimle atomiktir. Join'ler bağdaştırıcıya verilmez ya da yok sayılır: Better Auth ayrı
 *   sorgularla tamamlar (`advanced.database.joins` yalnızca ek sorguları birleştirir).
 * - Değerler: tarih `Date` (sürücü ISO metni gönderir), boolean yerel; json ve dizi alanları JSON metni olarak yazılır, jsonb okununca
 *   nesne gelir. int8 metin döner, `number` alanlarında sayıya çevrilir.
 * - Kimlikleri veritabanı üretiyorsa (`generateId: false` ya da `"uuid"`) `id` ve ona başvuran alanlar `uuid` sütunudur: UUID olmayan
 *   metin (istemciden gelen bozuk id) sütuna gitmez; `eq` hiçbir satırla, `ne` her dolu satırla eşleşir, `in` / `not_in` listesinden
 *   çıkarılır. Böylece sorgu `invalid input syntax for type uuid` ile düşmez, Better Auth "bulunamadı" görür. */
import type { DBAdapterInstance } from "better-auth";
import { type AdapterFactoryConfig, type CleanedWhere, createAdapterFactory, type CustomAdapter } from "better-auth/adapters";
import type { Database } from "./database";
import type { Connection } from "./driver";
import { AppError } from "./errors";
import { quoteIdentifier } from "./identifier";

/** Motorun sorgu yolu: transaction dışı sorgu tek gidiş-dönüş, transaction ayrılmış bağlantıda (timeout ve deadline motorundur). */
export type Queryable = Pick<Database, "query" | "transaction">;
type Executor = Pick<Connection, "query">;
type Params = unknown[];
type AdapterHelpers = Parameters<Parameters<typeof createAdapterFactory>[0]["adapter"]>[0];
/** Where alanı (veritabanı adı) `uuid` sütunu mu. */
type UuidKey = (field: string) => boolean;

const bind = (params: Params, value: unknown) => `$${params.push(value)}`;
/** LIKE deseninde `%`, `_` ve `\` kelimenin kendisidir. */
const likeLiteral = (value: unknown) => String(value).replace(/[\\%_]/g, "\\$&");
const LIKE: Record<string, (value: unknown) => string> = {
  contains: (value) => `%${likeLiteral(value)}%`,
  starts_with: (value) => `${likeLiteral(value)}%`,
  ends_with: (value) => `%${likeLiteral(value)}`,
};
const COMPARE: Record<string, string> = { eq: "=", ne: "<>", lt: "<", lte: "<=", gt: ">", gte: ">=" };

/** PostgreSQL `uuid` girdisinin kabul ettiği biçimler: 32 onaltılık hane, isteğe bağlı tireler ve süslü parantez. */
const UUID = /^(?:[0-9a-f]{8}-?(?:[0-9a-f]{4}-?){3}[0-9a-f]{12}|\{[0-9a-f]{8}-?(?:[0-9a-f]{4}-?){3}[0-9a-f]{12}\})$/i;
const notUuid = (value: unknown) => typeof value === "string" && !UUID.test(value);

const isInsensitive = ({ mode, value }: CleanedWhere) =>
  mode === "insensitive" && (typeof value === "string" || (Array.isArray(value) && value.every((item) => typeof item === "string")));

function listCondition(column: string, { operator, value }: CleanedWhere, insensitive: boolean, uuid: boolean, params: Params) {
  let items = (Array.isArray(value) ? value : [value]) as unknown[];
  if (uuid) items = items.filter((item) => !notUuid(item));
  if (!items.length) return operator === "in" ? "false" : "true";
  const list = items.map((item) => bind(params, insensitive ? String(item).toLowerCase() : item)).join(", ");
  return `${column} ${operator === "in" ? "IN" : "NOT IN"} (${list})`;
}

function condition(where: CleanedWhere, params: Params, uuidKey: UuidKey): string {
  const { field, operator, value } = where;
  const insensitive = isInsensitive(where);
  const column = quoteIdentifier(field);
  const uuid = uuidKey(field);
  if (operator === "in" || operator === "not_in") return listCondition(insensitive ? `lower(${column})` : column, where, insensitive, uuid, params);
  if (uuid && notUuid(value) && (operator === "eq" || operator === "ne")) return operator === "eq" ? "false" : `${column} IS NOT NULL`;
  const like = LIKE[operator];
  if (like) return `${column} ${insensitive ? "ILIKE" : "LIKE"} ${bind(params, like(value))}`;
  const compare = COMPARE[operator];
  if (!compare) throw new AppError("UNSUPPORTED", `Unsupported Better Auth where operator: ${operator}`);
  if (value === null && (operator === "eq" || operator === "ne")) return `${column} IS ${operator === "eq" ? "" : "NOT "}NULL`;
  if (insensitive && (operator === "eq" || operator === "ne")) return `lower(${column}) ${compare} ${bind(params, String(value).toLowerCase())}`;
  return `${column} ${compare} ${bind(params, value)}`;
}

/** `AND` koşulları ve varsa parantezli `OR` grubu; koşul yoksa boş. */
function whereClause(where: readonly CleanedWhere[] | undefined, params: Params, uuidKey: UuidKey): string {
  if (!where?.length) return "";
  const and: string[] = [];
  const or: string[] = [];
  for (const item of where) (item.connector === "OR" ? or : and).push(condition(item, params, uuidKey));
  if (or.length) and.push(or.length === 1 ? (or[0] as string) : `(${or.join(" OR ")})`);
  return ` WHERE ${and.join(" AND ")}`;
}

/** LIMIT/OFFSET yalnızca doğrulanmış tamsayı olarak metne girer. */
function integer(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new AppError("UNSUPPORTED", `Better Auth ${name} must be a non-negative integer`);
  return value;
}

const affected = (rows: { count?: number }) => rows.count ?? 0;

/** Tek bir yürütücüye (havuz ya da transaction bağlantısı) bağlı Better Auth yöntemleri. */
function sqlAdapter(executor: Executor, schema: string) {
  const tables = new Map<string, string>();
  const table = (model: string) => {
    let name = tables.get(model);
    if (!name) tables.set(model, (name = `${quoteIdentifier(schema)}.${quoteIdentifier(model)}`));
    return name;
  };
  const first = async <T>(text: string, params: Params) => ((await executor.query<T>(text, params))[0] ?? null) as T | null;

  return ({ getFieldName, getFieldAttributes, options }: AdapterHelpers): CustomAdapter => {
    const generateId = options.advanced?.database?.generateId;
    const databaseIds = generateId === false || generateId === "uuid";
    const uuidKeys = new Map<string, boolean>();
    /** Modelin `uuid` sütunları: `id` ve `id`'ye başvuran alanlar (yalnızca kimlikleri veritabanı üretiyorsa). */
    const uuidKeyOf = (model: string): UuidKey => (field) => {
      if (!databaseIds) return false;
      const key = `${model}\0${field}`;
      let uuid = uuidKeys.get(key);
      if (uuid === undefined) {
        const attributes = field === "id" ? undefined : getFieldAttributes({ model, field });
        uuidKeys.set(key, (uuid = field === "id" || attributes?.references?.field === "id"));
      }
      return uuid;
    };
    const where = (model: string, clauses: readonly CleanedWhere[] | undefined, params: Params) => whereClause(clauses, params, uuidKeyOf(model));
    const columns = (model: string, select?: string[]) =>
      select?.length ? select.map((field) => quoteIdentifier(getFieldName({ model, field }))).join(", ") : "*";
    const assignments = (data: Record<string, unknown>, params: Params) =>
      Object.entries(data).map(([column, value]) => `${quoteIdentifier(column)} = ${bind(params, value)}`);
    /** Koşula uyan ilk satırın kimliği; `consumeOne` ve `incrementOne` aynı deyimde kilitlemeden hedefler. */
    const firstId = (model: string, clauses: CleanedWhere[], params: Params) => {
      const id = quoteIdentifier(getFieldName({ model, field: "id" }));
      return `${id} IN (SELECT ${id} FROM ${table(model)}${where(model, clauses, params)} LIMIT 1)`;
    };

    return {
      create: async ({ model, data }) => {
        const params: Params = [];
        const keys = Object.keys(data);
        const values = keys.length ? ` (${keys.map(quoteIdentifier).join(", ")}) VALUES (${keys.map((key) => bind(params, data[key])).join(", ")})` : " DEFAULT VALUES";
        return (await first(`INSERT INTO ${table(model)}${values} RETURNING *`, params)) as typeof data;
      },
      findOne: ({ model, where: clauses, select }) => {
        const params: Params = [];
        return first(`SELECT ${columns(model, select)} FROM ${table(model)}${where(model, clauses, params)} LIMIT 1`, params);
      },
      findMany: async ({ model, where: clauses, limit, select, sortBy, offset }) => {
        const params: Params = [];
        let text = `SELECT ${columns(model, select)} FROM ${table(model)}${where(model, clauses, params)}`;
        if (sortBy?.field) text += ` ORDER BY ${quoteIdentifier(getFieldName({ model, field: sortBy.field }))} ${sortBy.direction === "desc" ? "DESC" : "ASC"}`;
        if (limit !== undefined) text += ` LIMIT ${integer(limit, "limit")}`;
        if (offset !== undefined) text += ` OFFSET ${integer(offset, "offset")}`;
        return executor.query(text, params);
      },
      count: async ({ model, where: clauses }) => {
        const params: Params = [];
        const row = await first<{ count: unknown }>(`SELECT count(*) AS count FROM ${table(model)}${where(model, clauses, params)}`, params);
        return Number(row?.count ?? 0);
      },
      update: async ({ model, where: clauses, update }) => {
        const params: Params = [];
        const set = assignments(update as Record<string, unknown>, params);
        if (!set.length) return first(`SELECT * FROM ${table(model)}${where(model, clauses, params)} LIMIT 1`, params);
        return first(`UPDATE ${table(model)} SET ${set.join(", ")}${where(model, clauses, params)} RETURNING *`, params);
      },
      updateMany: async ({ model, where: clauses, update }) => {
        const params: Params = [];
        const set = assignments(update, params);
        if (!set.length) return 0;
        return affected(await executor.query(`UPDATE ${table(model)} SET ${set.join(", ")}${where(model, clauses, params)}`, params));
      },
      delete: async ({ model, where: clauses }) => {
        const params: Params = [];
        await executor.query(`DELETE FROM ${table(model)}${where(model, clauses, params)}`, params);
      },
      deleteMany: async ({ model, where: clauses }) => {
        const params: Params = [];
        return affected(await executor.query(`DELETE FROM ${table(model)}${where(model, clauses, params)}`, params));
      },
      consumeOne: ({ model, where: clauses }) => {
        const params: Params = [];
        return first(`DELETE FROM ${table(model)} WHERE ${firstId(model, clauses, params)} RETURNING *`, params);
      },
      incrementOne: ({ model, where: clauses, increment, set }) => {
        const params: Params = [];
        const counters = Object.entries(increment).map(([column, delta]) => `${quoteIdentifier(column)} = COALESCE(${quoteIdentifier(column)}, 0) + ${bind(params, delta)}`);
        const values = [...counters, ...assignments(set ?? {}, params)].join(", ");
        const filter = where(model, clauses, params);
        return first(`UPDATE ${table(model)} SET ${values}${filter}${filter ? " AND" : " WHERE"} ${firstId(model, clauses, params)} RETURNING *`, params);
      },
    };
  };
}

const CONFIG = {
  adapterId: "repo-db",
  adapterName: "@koina/db",
  supportsBooleans: true,
  supportsDates: true,
  supportsJSON: false,
  supportsArrays: false,
  supportsUUIDs: true,
  // int8/numeric motorda metin döner; Better Auth `number` alanı sayı bekler.
  customTransformOutput: ({ data, fieldAttributes }) => (fieldAttributes.type === "number" && typeof data === "string" ? Number(data) : data),
} satisfies Omit<AdapterFactoryConfig, "transaction">;

/** `schema`'ya bağlı Better Auth `database` seçeneği. Transaction motorun `db.transaction`'ıdır: aynı ayrılmış bağlantı, `BEGIN … COMMIT`. */
export function engineAdapter(db: Queryable, schema: string): DBAdapterInstance {
  return (options) => {
    const inTransaction = (tx: Connection) => createAdapterFactory({ config: { ...CONFIG, transaction: false }, adapter: sqlAdapter(tx, schema) })(options);
    return createAdapterFactory({
      config: { ...CONFIG, transaction: (work) => db.transaction((tx) => work(inTransaction(tx))) },
      adapter: sqlAdapter(db, schema),
    })(options);
  };
}
