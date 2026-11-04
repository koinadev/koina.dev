/** Middleware girişi (`@koina/db/middleware`): veritabanını kurar ve isteğin context'ine `db` ekler (`query`, `transaction`,
 * `read.query`). Hono'nun `(c, next)` biçimine uyar (bağımlılık yok; `c.set` yeterli).
 *
 *   app.use(dbMiddleware({ driver: bunDriver })); // Bun/Node: süreç başına tek havuz, DATABASE_URLS
 *   app.use(dbMiddleware({ driver: postgresDriver, perRequest: true, config: (c) => workerConfig(c.env) })); // Workers
 *   app.get("/users/:email", async (c) => c.json(await c.get("db").query(findUserByEmail, [c.req.param("email")]))); // uygulamanın src/queries/users.sql'i
 *
 * HTTP dışında (cron, kuyruk, Worker `scheduled`) aynı yapı `createDbScope(db)` ile kurulur; kapsam havuz tutmaz, `db`'yi çağıran kapatır. */
import { type Config, loadConfig } from "./core/config";
import type { Queryable, ReadContext, ReadSession } from "./core/context";
import type { Driver } from "./core/driver";
import { AppError } from "./core/errors";
import { createDb, type Db, type DbOptions } from "./core/runtime";

/** İstek kapsamı: aynı istekte yazı çalıştıysa sonraki `read.query` okumaları primary'de kalır (read-your-writes); okumalar aynı replica'ya
 * sabitlenir (çağrılar arası monoton okuma). Başka isteğe taşan tutarlılık garanti edilmez. */
export interface RequestDb extends Queryable {
  readonly read: ReadContext;
}
export type { Db };

export function createDbScope(db: Db): RequestDb {
  let wrote = false;
  const markWrite = () => void (wrote = true);
  const session: ReadSession = {};
  return Object.freeze<RequestDb>({
    query: ((query, values) => db.run((ctx) => ctx.query(query, values), markWrite)) as Queryable["query"],
    transaction: (work) => db.run((ctx) => ctx.transaction(work), markWrite),
    read: Object.freeze<ReadContext>({ query: ((query, values) => db.readRun((ctx) => ctx.query(query, values), wrote, session)) as ReadContext["query"] }),
  });
}

export interface MiddlewareContext {
  set(key: "db", value: RequestDb): void;
  env?: unknown;
  /** Hono/Workers: `perRequest` havuzunun kapanışı yanıtı geciktirmesin diye `waitUntil`'e verilir. Hono bağlam yokken (Bun/Node) okumada fırlatır. */
  readonly executionCtx?: { waitUntil(work: Promise<unknown>): void };
}

const executionContext = (c: MiddlewareContext) => {
  try {
    return c.executionCtx;
  } catch {
    return undefined;
  }
};

/** `createDb` seçenekleri (`onSpan` middleware'in açtığı havuzun ölçümüdür); sürücü burada isteğe bağlıdır. */
type DbMiddlewareOptions<C extends MiddlewareContext> = Omit<DbOptions, "driver"> & {
  /** Uygulamanın açtığı veritabanı (`createDb`): `ready()`, Better Auth ve kapanış aynı havuzu kullanır; verilirse `driver`, `config` ve `perRequest` kullanılmaz. */
  database?: Db;
  driver?: Driver;
  /** Varsayılan `loadConfig()` (`process.env.DATABASE_URLS`); Workers'da binding'lerden. */
  config?: Config | ((c: C) => Config);
  /** Workers: istek başına `poolMax: 1` havuz, yanıttan sonra kapanır (soketler isteği aşamaz). */
  perRequest?: boolean;
};

/** Veritabanı kaynağı seçenekleri tutarlı olmalı; aksi halde `INVALID_CONFIG`. */
function assertMiddlewareOptions({ database, driver, perRequest }: DbMiddlewareOptions<never>) {
  const hasOneDatabaseSource = !database !== !driver;
  if (!hasOneDatabaseSource || (!!database && !!perRequest))
    throw new AppError("INVALID_CONFIG", "dbMiddleware needs either database or driver (perRequest only with driver)");
}

export function dbMiddleware<C extends MiddlewareContext>(middlewareOptions: DbMiddlewareOptions<C>) {
  assertMiddlewareOptions(middlewareOptions);
  const { database, driver, config, perRequest, ...options } = middlewareOptions;
  let shared: Db | undefined = database;
  const openDb = (c: C) => createDb(typeof config === "function" ? config(c) : (config ?? loadConfig()), { ...options, driver: driver as Driver, ...(perRequest && { poolMax: 1 }) });

  return async (c: C, next: () => Promise<void>) => {
    const db = perRequest ? openDb(c) : (shared ??= openDb(c));
    c.set("db", createDbScope(db));
    try {
      await next();
    } finally {
      if (perRequest) {
        // Soket kapanışı yanıtı beklemez (Workers'ta `waitUntil` kapanışı sonuna kadar yaşatır); bağlam yoksa beklenir. Kapanış hatası yanıtı değiştirmez.
        const closing = db.close().catch(() => {});
        const context = executionContext(c);
        if (context) context.waitUntil(closing);
        else await closing;
      }
    }
  };
}
