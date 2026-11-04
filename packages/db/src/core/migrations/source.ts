/** Kaynak dosya biçimi: `<yyyyMMddHHmmss>_<snake_name>.sql` (UTC; seed'lerde `.ts` de). ID = uzantısız ad, sıra = ID sırası.
 * Migration: `--up` satırı + SQL, `--down` satırı + SQL; checksum tüm dosya. Seed: SQL ise yalnızca DML, TS ise varsayılan
 * async fonksiyon. Codegen ve registry aynı derleyiciyi kullanır. */
import { createHash } from "node:crypto";
import type { Statement } from "pgsql-ast-parser";
import { type Queryable, runContext } from "../context";
import type { Connection } from "../driver";
import { AppError } from "../errors";
import { maskSqlComments, prepareMigration } from "../sql/compiler";

export const MIGRATION_NAME = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
export const SOURCE_FILE = /^(\d{14}_[a-z][a-z0-9]*(?:_[a-z0-9]+)*)\.(sql|ts)$/;

type Prepared = ReturnType<typeof prepareMigration>;
export interface Migration {
  readonly id: string;
  readonly checksum: string;
  readonly up: Prepared;
  /** Yoksa `--down` boştur: geri alınamaz. */
  readonly down?: Prepared;
  /** Up tek deyimi CREATE INDEX CONCURRENTLY ise: transaction dışında çalışır, tekrar denemede index incelenir. */
  readonly concurrentIndex?: Readonly<{ name: string; table: string; unique: boolean }>;
  /** Down tek deyimi DROP INDEX CONCURRENTLY ise düşürülecek index adı. */
  readonly concurrentDrop?: string;
}

/** TS seed'in aldığı bağlam: schema'ya bağlı `query` (üretilmiş sorgular) ve seed'in kendi transaction'ı. */
export interface SeedContext {
  readonly schema: string;
  readonly query: Queryable["query"];
  /** Seed zaten tek transaction'dadır; `work` aynı bağlamla çalışır. */
  transaction<T>(work: (db: Queryable) => Promise<T>): Promise<T>;
}
export interface Seed {
  readonly id: string;
  readonly checksum: string;
  run(tx: Connection, schema: string, verify: () => Promise<void>): Promise<void>;
}
/** Üretilmiş listedeki girdi: SQL metni veya checksum'ı codegen'de hesaplanmış TS fonksiyonu. */
export type SeedSource = string | { readonly checksum: string; readonly run: (context: SeedContext) => Promise<void> };

const invalid = (message: string) => new AppError("MIGRATION_INVALID", message);
export const checksum = (text: string) => createHash("sha256").update(text).digest("hex");

/** UTC `yyyyMMddHHmmss`. */
export const migrationPrefix = (now: Date) =>
  [now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()]
    .map((part, i) => String(part).padStart(i ? 2 : 4, "0"))
    .join("");

/** `--up` ve `--down` bölümleri; işaretler tam satırdır (`--` sonrasında boşluk olmadan), başka `--kelime` satırı reddedilir. */
export function splitMigration(id: string, source: string): { up: string; down: string } {
  const markers = [...source.matchAll(/^--(\w+)[ \t]*\r?$/gm)];
  const [up, down] = markers;
  if (markers.map((m) => m[1]).join() !== "up,down" || !up || !down)
    throw invalid(`${id}: expected one --up line followed by one --down line, found [${markers.map((m) => m[0].trim())}]`);
  if (source.slice(0, up.index).trim()) throw invalid(`${id}: content before --up`);
  return { up: source.slice(up.index + up[0].length, down.index), down: source.slice(down.index + down[0].length) };
}

/** CONCURRENTLY yalnızca bölümün tek deyimi olarak kabul edilir. */
function concurrentIndexStatement(id: string, statements: readonly Statement[], kind: "create index" | "drop index") {
  const found = statements.find((s) => (s.type === "create index" || s.type === "drop index") && s.concurrently);
  if (found && (statements.length !== 1 || found.type !== kind)) {
    const section = kind === "create index" ? "--up" : "--down";
    throw invalid(`${id}: ${found.type.toUpperCase()} CONCURRENTLY must be the only statement of a ${section} section`);
  }
  return found;
}

/** Sıralı `[id, kaynak]` listesi: ID biçimi ve artan sıra denetlenir, hatalar ID ile öneklenir. */
function compileList<S, T>(list: readonly (readonly [string, S])[], compileOne: (id: string, source: S) => T): readonly T[] {
  let previous = "";
  return Object.freeze(
    list.map(([id, source]) => {
      if (!SOURCE_FILE.test(`${id}.sql`) || id <= previous) throw invalid(`${id}: IDs must be <yyyyMMddHHmmss>_<snake_name>, unique and increasing`);
      previous = id;
      try {
        return Object.freeze(compileOne(id, source));
      } catch (error) {
        if (error instanceof AppError && !error.message.startsWith(id)) throw new AppError(error.code, `${id}: ${error.message}`);
        throw error;
      }
    }),
  );
}

/** Enum tipleri dosyalar boyunca taşınır. */
export function compileMigrations(list: readonly (readonly [string, string])[]): readonly Migration[] {
  const types = new Set<string>();
  return compileList(list, (id, source) => {
    const sections = splitMigration(id, source);
    const up = prepareMigration(sections.up, types);
    const down = maskSqlComments(sections.down).trim() ? prepareMigration(sections.down, new Set(types)) : undefined;
    const index = concurrentIndexStatement(id, up.statements, "create index");
    const drop = down && concurrentIndexStatement(id, down.statements, "drop index");
    if (index?.type === "create index" && !index.indexName) throw invalid(`${id}: concurrent index needs a name`);
    if (drop?.type === "drop index" && drop.names.length !== 1) throw invalid(`${id}: DROP INDEX CONCURRENTLY takes one index`);
    return {
      id,
      checksum: checksum(source),
      up,
      down,
      concurrentIndex:
        index?.type === "create index" ? Object.freeze({ name: index.indexName?.name ?? "", table: index.table.name, unique: !!index.unique }) : undefined,
      concurrentDrop: drop?.type === "drop index" ? drop.names[0]?.name : undefined,
    };
  });
}

/** SQL seed: schema'ya bağlanan INSERT/UPDATE/DELETE. TS seed: schema'ya bağlı bağlamla çağrılır. */
export function compileSeeds(list: readonly (readonly [string, SeedSource])[]): readonly Seed[] {
  return compileList(list, (id, source): Seed => {
    if (typeof source !== "string") {
      const run = (tx: Connection, schema: string) => runContext(tx, undefined, schema, (db) => source.run({ schema, query: db.query, transaction: (work) => work(db) }));
      return { id, checksum: source.checksum, run };
    }
    const prepared = prepareMigration(source);
    if (prepared.statements.some((s) => !["insert", "update", "delete"].includes(s.type)))
      throw invalid(`${id}: SQL seeds may only contain INSERT, UPDATE or DELETE`);
    async function run(tx: Connection, schema: string, verify: () => Promise<void>) {
      for (const statement of prepared.bind(schema)) {
        await verify();
        await tx.exec(statement);
      }
    }
    return { id, checksum: checksum(source), run };
  });
}
