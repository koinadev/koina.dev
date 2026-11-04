/** Sürücü havuzunu motorun sorgu yoluna uyarlar ve birincil ile replica havuzlarını tutar. Bağlantı edinmenin istemci deadline'ı ve bekleyen
 * iş sınırı vardır. Runtime'da sunucu tarafı timeout DB varsayılanıdır (`migrate`: `ALTER DATABASE … SET statement_timeout/
 * lock_timeout/client_connection_check_interval`; PgBouncer transaction pooling ve Hyperdrive'da da geçerlidir): tek sorgu tek
 * gidiş-dönüş, transaction yalnızca `BEGIN`. `timeouts` verilen havuzlar (yönetim) her işi `SET LOCAL` ile transaction'da çalıştırır.
 *
 * Her deyim (`BEGIN`, transaction deyimleri, `COMMIT`/`ROLLBACK`, `exec`) ayrılmış bağlantıda cevap deadline'ıyla çalışır. Süresi dolan
 * deyimin bağlantısı iptal edilir (sürücü destekliyorsa), cevap kısa süre beklenir ve bağlantı havuza hiç dönmez (bkz. `deadlineSession`). */
import type { Config } from "./config";
import { type Connection, type Driver, type Pool, type PoolOptions, type Reserved, runInTransaction } from "./driver";
import { AppError, driverError, errorCode } from "./errors";

export interface Timeouts {
  statementTimeoutMs: number;
  lockTimeoutMs: number;
}
export interface TransactionOptions extends Partial<Timeouts> {
  /** `BEGIN` sonrasına eklenir, ör. `" ISOLATION LEVEL REPEATABLE READ READ ONLY"` (sabit metin, girdi değil). */
  mode?: string;
}
export interface Database extends Connection {
  transaction<T>(work: (tx: Connection) => Promise<T>, options?: TransactionOptions): Promise<T>;
  /** Deadline ve bekleme sınırı olmayan ham havuz: `pg_cancel_backend`, `CREATE DATABASE` gibi özel işler için. */
  readonly pool: Pool;
  close(): Promise<void>;
}
/** Ölçüm noktası: `db.acquire` (bağlantı bekleme), `db.query`, `db.transaction` (BEGIN…COMMIT); yönetimde işlem adımları (`migration`, `rollback`, `seed`). */
export interface Span {
  name: string;
  /** Başlangıç (Unix epoch, ms). */
  startTime: number;
  ms: number;
  /** İş hata verdiyse kararlı hata kodu (`errorCode`). */
  error?: string;
  detail?: string;
}
export type SpanHandler = (span: Span) => void;

export interface DatabaseSettings {
  /** Bağlantı edinme deadline'ı (timeout'lu transaction'da statement timeout'u); deyimin cevap deadline'ı bundan `ANSWER_MARGIN_MS` uzundur. */
  deadlineMs: number;
  maxPending: number;
  timeouts?: Timeouts;
  onSpan?: SpanHandler;
}

/** SQLSTATE `query_canceled`: sunucunun statement timeout'u ya da iptal. */
const QUERY_CANCELED = "57014";
/** Deyimin cevap süresi sunucu timeout'undan bu kadar uzundur; sunucu statement_timeout'u normalde önce düşer. */
const ANSWER_MARGIN_MS = 1000;
/** Süresi dolan deyim iptal edildikten sonra cevabın (sonuç ya da 57014) en çok beklendiği süre. */
const CANCEL_WAIT_MS = 500;
const POOL_CLOSE_TIMEOUT_MS = 5000;
const CONNECT_TIMEOUT_SECONDS = 10;

export const deadlineExceeded = () => new AppError("DATABASE_TIMEOUT", "Database query deadline exceeded");

/** Sunucu statement timeout'u (57014) `DATABASE_TIMEOUT` olur; diğer hatalar olduğu gibi kalır. */
const mapServerTimeout = (error: unknown) => (errorCode(error) === QUERY_CANCELED ? deadlineExceeded() : error);

/** Telemetri bağdaştırıcısının hatası veritabanı işini asla düşürmez. */
export function reportSpan(onSpan: SpanHandler, span: Span) {
  try {
    onSpan(span);
  } catch {
    // Telemetri hatası yok sayılır.
  }
}

/** `onSpan` yoksa işi olduğu gibi döndürür (sıcak yolda ek await yok). */
export function spanner(onSpan: SpanHandler | undefined, base: Omit<Span, "name" | "ms" | "startTime"> = {}) {
  return <T>(name: string, work: () => Promise<T>, extra?: Omit<Span, "name" | "ms" | "startTime">): Promise<T> => {
    if (!onSpan) return work();
    const startTime = Date.now();
    const start = performance.now();
    const finish = (error?: unknown) =>
      reportSpan(onSpan, { name, startTime, ms: performance.now() - start, ...base, ...extra, ...(error === undefined ? {} : { error: errorCode(error) }) });
    return work().then(
      (value) => {
        finish();
        return value;
      },
      (error: unknown) => {
        finish(error);
        throw error;
      },
    );
  };
}

/** Bağlantı edinme ve cevap deadline'ları. Deyim başına zamanlayıcı yok: tek zamanlayıcı en erken süresi dolacak kayda kurulur;
 * çaldığında süresi dolanların `expire`'ı çağrılır ve sıradaki en erken kayda yeniden kurulur (süreci ayakta tutmaz). Yoğun trafikte
 * kayıtlar süresi dolmadan silinir; zamanlayıcı deadline başına en çok bir kez çalar. */
interface Deadline {
  due: number;
  expire: () => void;
}
function createDeadlines() {
  const inflight = new Set<Deadline>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timerDue = Number.POSITIVE_INFINITY;

  function arm(due: number) {
    if (due >= timerDue) return;
    clearTimeout(timer);
    timerDue = due;
    timer = setTimeout(fire, Math.max(0, due - performance.now()));
    (timer as { unref?: () => void }).unref?.();
  }

  function fire() {
    timer = undefined;
    timerDue = Number.POSITIVE_INFINITY;
    const now = performance.now();
    let next = Number.POSITIVE_INFINITY;
    for (const entry of inflight)
      if (entry.due <= now) {
        inflight.delete(entry);
        entry.expire();
      } else if (entry.due < next) next = entry.due;
    if (next !== Number.POSITIVE_INFINITY) arm(next);
  }

  /** `ms` sonra `expire`; `unwatch(kayıt)` kaydı siler. */
  function watch(ms: number, expire: () => void): Deadline {
    const entry = { due: performance.now() + ms, expire };
    inflight.add(entry);
    arm(entry.due);
    return entry;
  }

  return { watch, unwatch: (entry: Deadline) => void inflight.delete(entry), close: () => clearTimeout(timer) };
}
type Deadlines = ReturnType<typeof createDeadlines>;

/**
 * Ayrılmış bağlantıda deadline'lı deyimler. Deadline'ı dolan deyimde bağlantı "süresi doldu" olur: üzerinde başka deyim çalışmaz ve
 * havuza dönmez (`release(true)`). Sürücü destekliyorsa deyim sunucuda iptal edilir ve cevap `CANCEL_WAIT_MS` beklenir: bu sürede gelen
 * cevap olduğu gibi döner (deyim commit ettiyse çağıran bunu görür), gelmezse `DATABASE_TIMEOUT`. Atılan bağlantının hâlâ çalışan deyimini
 * sunucu `client_connection_check_interval` ile keser; commit edilmemiş transaction geri alınır, PgBouncer kuyruğundaki deyim hiç gitmez.
 */
class DeadlineSession {
  private expired = false;
  constructor(
    readonly reserved: Reserved,
    private readonly deadlines: Deadlines,
  ) {}

  /** Cevap deadline'ı `ms` olan deyim (`undefined`: yalnızca sunucu timeout'u). */
  bounded<T>(ms: number | undefined, answer: () => Promise<T>): Promise<T> {
    if (this.expired) return Promise.reject(deadlineExceeded());
    const pending = answer();
    if (ms === undefined) return pending;
    return new Promise<T>((resolve, reject) => {
      let wait: ReturnType<typeof setTimeout> | undefined;
      const entry = this.deadlines.watch(ms, () => {
        this.expired = true;
        this.reserved.cancel?.();
        wait = setTimeout(() => reject(deadlineExceeded()), CANCEL_WAIT_MS);
      });
      pending.then(
        (value) => {
          this.deadlines.unwatch(entry);
          if (wait !== undefined) clearTimeout(wait);
          resolve(value);
        },
        (error: unknown) => {
          this.deadlines.unwatch(entry);
          if (wait !== undefined) clearTimeout(wait);
          reject(error);
        },
      );
    });
  }

  /** Cevap deadline'ı `ms` olan görünüm. */
  connection(ms: number | undefined): Connection {
    return {
      query: (text, params) => this.bounded(ms, () => this.reserved.query(text, params)),
      exec: (text) => this.bounded(ms, () => this.reserved.exec(text)),
    };
  }

  release() {
    this.reserved.release(this.expired);
  }
}

/** Deadline dolarsa iş hiç başlamaz; geç gelen bağlantı kullanılmadan geri verilir. */
function acquireWithin(reserve: () => Promise<Reserved>, ms: number, deadlines: Deadlines): Promise<Reserved> {
  return new Promise<Reserved>((resolve, reject) => {
    let late = false;
    const entry = deadlines.watch(ms, () => {
      late = true;
      reject(deadlineExceeded());
    });
    reserve().then(
      (connection) => {
        if (late) return connection.release();
        deadlines.unwatch(entry);
        resolve(connection);
      },
      (error: unknown) => {
        if (late) return;
        deadlines.unwatch(entry);
        reject(error);
      },
    );
  });
}

/** `BEGIN` ve `SET LOCAL` metni; seçenekte verilmeyen timeout havuzun `timeouts` değerinden gelir. */
function beginSql(options: TransactionOptions, timeouts: Timeouts | undefined) {
  const statementTimeoutMs = options.statementTimeoutMs ?? timeouts?.statementTimeoutMs;
  const lockTimeoutMs = options.lockTimeoutMs ?? timeouts?.lockTimeoutMs;
  const statements = [`BEGIN${options.mode ?? ""}`];
  if (statementTimeoutMs !== undefined) statements.push(`SET LOCAL statement_timeout = ${statementTimeoutMs}`);
  if (lockTimeoutMs !== undefined) statements.push(`SET LOCAL lock_timeout = ${lockTimeoutMs}`);
  return { begin: statements.join("; "), statementTimeoutMs };
}

/** Sürücü hatası çağırana yalnızca koduyla çıkar (`DriverError`); `release`/`cancel` ve uygulamanın kendi hataları dokunulmadan kalır. */
function guarded<T>(run: () => Promise<T>): Promise<T> {
  try {
    return run().catch((error: unknown) => Promise.reject(driverError(error)));
  } catch (error) {
    return Promise.reject(driverError(error));
  }
}
const guardReserved = (reserved: Reserved): Reserved => ({
  query: ((text, params) => guarded(() => reserved.query(text, params))) as Reserved["query"],
  exec: (text) => guarded(() => reserved.exec(text)),
  release: (discard) => reserved.release(discard),
  ...(reserved.cancel && { cancel: () => reserved.cancel?.() }),
});
/** Bağlantı edinme ve ayrılmış bağlantının deyimleri `DriverError`'a çevrilir (`connect` ve yönetimin kilit oturumu). */
export const reserveGuarded = (pool: Pool) => guarded(() => pool.reserve()).then(guardReserved);

export function connect(pool: Pool, { deadlineMs, maxPending, timeouts, onSpan }: DatabaseSettings): Database {
  // Tek sarma: tek deyim, transaction deyimleri, BEGIN/COMMIT/ROLLBACK ve bağlantı edinme. `Database.pool` ham kalır (özel yönetim işleri).
  const reserve = () => reserveGuarded(pool);
  let pending = 0;
  const timed = spanner(onSpan);
  // PgBouncer sunucusuz kalırsa (DB kapalı) cevap `query_wait_timeout`'a kadar gelmez; sunucu timeout'u işlemez.
  const deadlines = createDeadlines();
  const answerMs = deadlineMs + ANSWER_MARGIN_MS;
  const acquire = (ms: number) => acquireWithin(reserve, ms, deadlines);

  /** Ayrılmış bir bağlantıda iş; bekleyen iş sınırı dolarsa `DATABASE_BUSY`. */
  async function withReserved<T>(acquireMs: number, work: (session: DeadlineSession) => Promise<T>): Promise<T> {
    if (pending >= maxPending) throw new AppError("DATABASE_BUSY", "Database client is saturated");
    pending++;
    try {
      const session = new DeadlineSession(await (onSpan ? timed("db.acquire", () => acquire(acquireMs)) : acquire(acquireMs)), deadlines);
      try {
        return await work(session);
      } finally {
        session.release();
      }
    } catch (error) {
      throw mapServerTimeout(error);
    } finally {
      pending--;
    }
  }

  function transaction<T>(work: (tx: Connection) => Promise<T>, options: TransactionOptions = {}): Promise<T> {
    const { begin, statementTimeoutMs } = beginSql(options, timeouts);
    // `statement_timeout = 0` deyimleri sınırsız bırakır; BEGIN (PgBouncer'da sunucu beklemesi) her zaman deadline'lıdır.
    const statementMs = statementTimeoutMs === 0 ? undefined : (statementTimeoutMs ?? deadlineMs) + ANSWER_MARGIN_MS;
    return withReserved(statementTimeoutMs || deadlineMs, (session) =>
      timed("db.transaction", () => runInTransaction(session.connection(statementMs), begin, work, session.connection(answerMs))),
    );
  }

  /** Tek deyim (runtime'ın sıcak yolu): bağlantı edinme ve cevap tek deadline kaydını paylaşır; kayıt bağlantı gelince cevap
   * deadline'ına uzatılır. Davranış `withReserved` + `DeadlineSession` ile aynıdır: edinme süresi dolarsa deyim hiç gitmez ve geç gelen
   * bağlantı kullanılmadan bırakılır; cevap süresi dolarsa deyim iptal edilir, `CANCEL_WAIT_MS` içinde gelen cevap döner, bağlantı atılır. */
  function single<T>(statement: (connection: Reserved) => Promise<T>, detail?: string): Promise<T> {
    if (pending >= maxPending) return Promise.reject(new AppError("DATABASE_BUSY", "Database client is saturated"));
    pending++;
    const acquireStart = onSpan ? performance.now() : 0;
    const acquireTime = onSpan ? Date.now() : 0;
    let queryStart = 0;
    let queryTime = 0;
    return new Promise<T>((resolve, reject) => {
      let reserved: Reserved | undefined;
      let expired = false;
      let settled = false;
      let wait: ReturnType<typeof setTimeout> | undefined;
      const span = (name: string, startTime: number, start: number, error: unknown, failed: boolean, spanDetail?: string) =>
        reportSpan(onSpan as SpanHandler, {
          name,
          startTime,
          ms: performance.now() - start,
          ...(spanDetail ? { detail: spanDetail } : {}),
          ...(failed ? { error: errorCode(error) } : {}),
        });
      const settle = (failed: boolean, outcome: unknown) => {
        if (settled) return;
        settled = true;
        deadlines.unwatch(entry);
        if (wait !== undefined) clearTimeout(wait);
        if (onSpan) {
          if (reserved) span("db.query", queryTime, queryStart, outcome, failed, detail);
          else span("db.acquire", acquireTime, acquireStart, outcome, failed);
        }
        reserved?.release(expired);
        pending--;
        if (failed) reject(mapServerTimeout(outcome));
        else resolve(outcome as T);
      };
      const entry = deadlines.watch(deadlineMs, () => {
        if (!reserved) return settle(true, deadlineExceeded());
        expired = true;
        reserved.cancel?.();
        wait = setTimeout(() => settle(true, deadlineExceeded()), CANCEL_WAIT_MS);
      });
      reserve().then(
        (connection) => {
          if (settled) return connection.release();
          reserved = connection;
          if (onSpan) {
            span("db.acquire", acquireTime, acquireStart, undefined, false);
            queryStart = performance.now();
            queryTime = Date.now();
          }
          // Cevap deadline'ı: zamanlayıcı daha erken kurulu kalır, çaldığında bu kayda yeniden kurulur.
          entry.due = performance.now() + answerMs;
          let answer: Promise<T>;
          try {
            answer = statement(connection);
          } catch (error) {
            return settle(true, error);
          }
          answer.then(
            (value) => settle(false, value),
            (error: unknown) => settle(true, error),
          );
        },
        (error: unknown) => settle(true, error),
      );
    });
  }

  function query(text: string, params?: readonly unknown[]) {
    if (timeouts) return transaction((tx) => tx.query(text, params));
    return single((connection) => connection.query(text, params), text);
  }

  const exec = (text: string) => (timeouts ? transaction((tx) => tx.exec(text)) : single((connection) => connection.exec(text), text));

  return {
    pool,
    transaction,
    query: query as Database["query"],
    exec,
    close: () => {
      deadlines.close();
      return guarded(() => pool.close(POOL_CLOSE_TIMEOUT_MS));
    },
  };
}

type PoolConfig = Config & Pick<PoolOptions, "idleTimeoutSeconds" | "maxLifetimeSeconds">;
export type Pools = ReturnType<typeof createPools>;

/** Tek birincil havuz (hemen açılır) ve replica havuzları (config sırasıyla; her biri yalnızca o indeks ilk kullanıldığında tembel
 * açılır); her havuz `max` bağlantı alır. */
export function createPools(config: PoolConfig, driver: Driver, max: number, settings: DatabaseSettings) {
  const { idleTimeoutSeconds, maxLifetimeSeconds } = config;
  const open = (url: string) => connect(driver(url, { max, idleTimeoutSeconds, maxLifetimeSeconds, connectTimeoutSeconds: CONNECT_TIMEOUT_SECONDS }), settings);
  const primary = open(config.url);
  const replicas: Database[] = [];
  let closing: Promise<void> | undefined;

  /** Eşzamanlı çağrılar aynı kapanışı bekler; havuzlar bir kez kapanır, hata kodla (`DriverError`) kalır. */
  function close() {
    return (closing ??= (async () => {
      const outcomes = await Promise.allSettled([primary, ...replicas.filter(Boolean)].map((db) => db.close()));
      const failed = outcomes.find((outcome) => outcome.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
    })());
  }

  return {
    primary,
    replica(index: number): Database {
      if (closing) throw new AppError("DATABASE_CLOSED", "Database clients are closed");
      return (replicas[index] ??= open(config.replicas[index] as string));
    },
    replicaUrls: config.replicas,
    close,
  };
}
