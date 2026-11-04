/** Runtime fabrikası: tek birincil havuz (+ replica havuzları), pooler kanıtı ve schema'ya bağlı sorgu/transaction/okuma. Yönetim, parser,
 * araçlar ve sürücü modüllerini yüklemez. */
import { type Config, type DatabaseOptions, loadConfig, replicaPolicy, runtimeSettings } from "./config";
import { createReader, type Queryable, type ReadContext, runContext } from "./context";
import { createPools, type SpanHandler } from "./database";
import type { Driver } from "./driver";
import { AppError, DriverError, errorCode } from "./errors";
import { DEFAULT_SCHEMA, validateSchema } from "./identifier";
import { usesTransactionPooler } from "./pooler";
import { createReplicaRouter } from "./replicas";
import type { PreparedQuery } from "./sql/query";

export interface DbOptions extends DatabaseOptions {
  /** `@koina/db/drivers/bun|postgres|pg|neon`; yalnızca import edilen sürücü bundle'a girer. */
  driver: Driver;
  /** Uygulama tablolarının schema'sı; verilmezse `public`. Her sorgu `"<schema>".tablo` olarak bağlanır. */
  schema?: string;
  /** Ölçüm: bağlantı bekleme, sorgu ve transaction süresi (bkz. `Span`). Verilmezse ek maliyet yok. */
  onSpan?: SpanHandler;
  /** `verified` (varsayılan): `ready()` URL'nin transaction-mode pooler arkasında olduğunu sınar, değilse `POOLER_REQUIRED`.
   * `assumed`: sınama atlanır (sınanamayan ortamlar, ör. doğrulanmamış Hyperdrive); pooler olduğunu sağlamak uygulamanın işidir. */
  pooler?: "verified" | "assumed";
}

/** Bekleyen bağlantı işi sınırı; aşılırsa `DATABASE_BUSY`. */
const RUNTIME_MAX_PENDING = 64;

/** Bun: süreç başına bir kez. Workers: istek başına `{ poolMax: 1 }` ile bir kez (soketler isteği aşamaz). */
function openDb(input: Config, { driver, schema = DEFAULT_SCHEMA, onSpan, pooler = "verified", replicaOnUnavailable, ...options }: DbOptions) {
  // Seçenekler havuz açılmadan doğrulanır; zorunluluk yalnızca bilinçli bir kararla atlanabilir.
  if (pooler !== "verified" && pooler !== "assumed") throw new AppError("INVALID_CONFIG", 'pooler must be "verified" or "assumed"');
  validateSchema(schema);
  const onUnavailable = replicaPolicy(replicaOnUnavailable);
  const config = runtimeSettings(input, options);
  // Sunucu tarafı timeout'lar DB varsayılanıdır (`migrate` yazar): tek sorgu tek gidiş-dönüş.
  const pools = createPools(config, driver, config.poolMax, { deadlineMs: config.statementTimeoutMs, maxPending: RUNTIME_MAX_PENDING, onSpan });
  const router = createReplicaRouter({ pools, maxLagMs: config.replicaMaxLagMs, statusMs: config.replicaStatusMs });
  /** Yazma bağlamı; `onWrite` istek kapsamının (`createDbScope`) yazıdan sonra okumayı primary'de tutması içindir. */
  const run = <T>(work: (db: Queryable) => Promise<T>, onWrite?: () => void) => runContext(pools.primary, pools.primary, schema, work, { onWrite });
  /** Okuma bağlamı: replica'dan, yoksa politikaya göre primary'den; bkz. `createReader`. */
  const readRun = createReader(pools, router, onUnavailable, schema);

  // Sürücü mesajı kullanıcı/DB adı taşıyabilir (28P01, 3D000): motorun kendi hatası (`DATABASE_TIMEOUT`, `POOLER_REQUIRED` …) olduğu gibi
  // kalır; sürücü hatası (`DriverError` ya da ham) yalnızca koduyla `DATABASE_UNAVAILABLE` olur.
  const notReady = (error: unknown) =>
    error instanceof AppError && !(error instanceof DriverError) ? error : new AppError("DATABASE_UNAVAILABLE", `Database is not reachable (${errorCode(error)})`);
  let poolerCheck: Promise<void> | undefined;
  // Eşzamanlı `ready()` çağrıları aynı sonucu bekler, başarılı sonuç saklanır, başarısız olan silinir.
  const checkPooler = () => {
    if (!poolerCheck) {
      poolerCheck = usesTransactionPooler(driver, config.url, { deadlineMs: config.statementTimeoutMs + 1000 }).then(
        (pooled) => {
          if (!pooled)
            throw new AppError("POOLER_REQUIRED", 'Database is reachable without a transaction pooler; use a transaction-mode pooler URL in DATABASE_URLS or set pooler: "assumed"');
        },
        (error: unknown) => {
          throw notReady(error);
        },
      );
      poolerCheck.catch(() => (poolerCheck = undefined));
    }
    return poolerCheck;
  };
  /** Hazır: veritabanı cevap veriyor; `pooler: "verified"` iken URL bir transaction-mode pooler'a gidiyor. Aksi halde `DATABASE_UNAVAILABLE`,
   * `DATABASE_TIMEOUT` veya `POOLER_REQUIRED`. Başlangıçta ve sağlık uç noktasında çağırın (istek yolunda değil). */
  const ready = async () => {
    await pools.primary.query("SELECT 1").catch((error: unknown) => {
      throw notReady(error);
    });
    if (pooler === "verified") await checkPooler();
  };

  return Object.freeze({
    schema,
    config,
    pools,
    run,
    readRun,
    query: ((query: PreparedQuery, values?: readonly unknown[]) => run((db) => db.query(query, values))) as Queryable["query"],
    transaction: <T>(work: (tx: Queryable) => Promise<T>) => run((db) => db.transaction(work)),
    /** Okuma sorguları replica'dan (yalnızca `readOnly` sorgular; bkz. `docs/replicas.md`). */
    read: Object.freeze<ReadContext>({ query: ((query: PreparedQuery, values?: readonly unknown[]) => readRun((db) => db.query(query, values))) as ReadContext["query"] }),
    /** Replica durumu (sağlık, lag, kullanılabilirlik); önbelleğe bakmadan yoklar. URL içermez. */
    replicas: () => router.report(),
    ready,
    close: pools.close,
  });
}

export type Db = ReturnType<typeof openDb>;

/** Süreç başına bir kez (Workers'ta istek başına `poolMax: 1`). Config verilmezse `DATABASE_URLS` okunur:
 *   createDb({ driver: bunDriver })
 *   createDb(createConfig(env.DB.connectionString), { driver: postgresDriver, poolMax: 1 }) */
export function createDb(options: DbOptions): Db;
export function createDb(config: Config, options: DbOptions): Db;
export function createDb(configOrOptions: Config | DbOptions, options?: DbOptions): Db {
  return "url" in configOrOptions ? openDb(configOrOptions, options as DbOptions) : openDb(loadConfig(), configOrOptions);
}
