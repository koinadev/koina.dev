/** Yönetim oturumları: ayrılmış doğrudan bağlantı, ölüm tespiti, sunucu tarafı iptal ve advisory lock sahipliği.
 * Session advisory lock'ları transaction pooler arkasında çalışmaz; oturum açılırken bağlantının doğrudan olduğu doğrulanır. */
import { reserveGuarded } from "./database";
import { type Connection, type Driver, type Pool, type Reserved, runInTransaction } from "./driver";
import { AppError, databaseUnavailable, driverError } from "./errors";
import type { Management } from "./management";

/** Watchdog: sunucu statement_timeout'u (ya da `watchdogMs`) bu kadar sonra hâlâ cevap yoksa bağlantı ölü sayılır. */
export const WATCHDOG_GRACE_MS = 5000;

/** Tek advisory lock anahtarı: aynı anda en fazla bir migration/seed/baseline çalışması. */
export const MIGRATION_KEY = "migration";

const SESSION_SETTINGS_SQL =
  "SELECT set_config('statement_timeout',$1,false),set_config('lock_timeout',$2,false),set_config('application_name',$3,false)";
const TRY_LOCK_SQL = "SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked";
const LOCK_HELD_SQL =
  "SELECT pg_backend_pid() AS pid,EXISTS(SELECT 1 FROM pg_locks WHERE pid=pg_backend_pid() AND locktype='advisory' AND granted AND classid=((hashtextextended($1,0)>>32)&4294967295)::oid AND objid=(hashtextextended($1,0)&4294967295)::oid AND objsubid=1) AS held";
const UNLOCK_SQL = "SELECT pg_advisory_unlock(hashtextextended($1,0)) AS unlocked";

const lockLost = (message = "Management connection closed") => new AppError("LOCK_LOST", message);
export const cancelled = () => new AppError("MIGRATION_CANCELLED", "Operation interrupted; inspect ledger before resuming");
const busy = () => new AppError("MIGRATION_RUNNER_BUSY", "Another migration run is active; retry when it finishes");

/** Her yazımdan önce tek sahiplik kontrolü: tutulan her kilit canlı ve iş iptal edilmemiş. */
export function ownershipCheck(signal: AbortSignal, ...checks: (() => void | Promise<void>)[]) {
  return async () => {
    for (const check of checks) await check();
    if (signal.aborted) throw cancelled();
  };
}

/** Ayrılmış havuzun kapanış hatası yok sayılır: asıl sonucu (hata ya da başarı) değiştirmez, ham mesajı da çıkmaz. */
const closePool = (pool: Pool) => pool.close(1000).catch(() => {});

const backendPid = async (db: Connection) => Number((await db.query<{ pid: number }>("SELECT pg_backend_pid() AS pid"))[0]?.pid);

/** Bu süreçte doğrudan olduğu kanıtlanmış URL'ler; yoklama URL başına bir ek bağlantıya mal olur. */
const direct = new Set<string>();

/** Erken hata: transaction pooler arkasında bağımsız bir bağlantı aynı backend'e düşer (LIFO yeniden kullanım) ya da ayrılmış
 * oturum backend'ler arasında taşınır. En iyi çaba: yoğun bir pooler tek yoklamada kendini gizleyebilir. */
async function assertDirect(driver: Driver, url: string, session: Connection, pid: number) {
  if (direct.has(url)) return;
  const probe = driver(url, { max: 1, idleTimeoutSeconds: 1, maxLifetimeSeconds: 0, connectTimeoutSeconds: 10 });
  try {
    if ((await backendPid(probe)) === pid || (await backendPid(session)) !== pid)
      throw new AppError(
        "DIRECT_CONNECTION_REQUIRED",
        "Management needs direct or session-pooled PostgreSQL URLs in DATABASE_URLS; transaction poolers (PgBouncer transaction mode, Hyperdrive) drop session advisory locks",
      );
    direct.add(url);
  } catch (error) {
    // Yoklama havuzu ham sürücü hatası verir (mesajda host olabilir): yalnızca koduyla çıkar.
    throw driverError(error);
  } finally {
    await closePool(probe);
  }
}

/** Oturumun canlılık durumu: kayıp (abort) sinyali, kapanış bayrağı ve her sorguyu saran watchdog. */
function createLiveness(pool: Pool, watchdogMs: number) {
  const aborter = new AbortController();
  const { signal } = aborter;
  const lost = new Promise<never>((_, reject) => signal.addEventListener("abort", () => reject(lockLost()), { once: true }));
  lost.catch(() => {});
  let closed = false;

  function markLost() {
    if (signal.aborted) return;
    aborter.abort();
    void pool.close(0).catch(() => {});
  }
  function assertAlive() {
    if (signal.aborted || closed) throw lockLost();
  }
  /** İş; oturum kaybı, bağlantı hatası veya watchdog süresinden hangisi önce gelirse onunla biter. */
  function guard<T>(work: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watchdog = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        markLost();
        reject(lockLost());
      }, watchdogMs);
    });
    return Promise.race([work, lost, watchdog])
      .catch((error: unknown) => {
        if (databaseUnavailable(error)) markLost();
        throw error;
      })
      .finally(() => clearTimeout(timer));
  }
  return {
    signal,
    markLost,
    assertAlive,
    guard,
    /** Sürücü kapanış bildirimi: kendi `close` çağrımızdan önce gelirse oturum kaybedilmiştir. */
    onPoolClose: () => closed || markLost(),
    /** Kapanışı işaretler; zaten kapanmışsa false. */
    beginClose() {
      if (closed) return false;
      closed = true;
      return true;
    },
  };
}
type Liveness = ReturnType<typeof createLiveness>;

/** Her sorgudan önce canlılığı denetleyen ve sorguyu watchdog ile saran bağlantı; transaction'lar oturumun kendi zaman aşımlarını kullanır. */
function guardedConnection(reserved: Reserved, { assertAlive, guard }: Liveness) {
  const db = {
    async query<R = Record<string, unknown>>(text: string, params?: readonly unknown[]): Promise<R[]> {
      assertAlive();
      return guard(reserved.query<R>(text, params));
    },
    async exec(text: string) {
      assertAlive();
      await guard(reserved.exec(text));
    },
    transaction: <T>(work: (tx: Connection) => Promise<T>): Promise<T> => runInTransaction(db, "BEGIN", work),
  };
  return db;
}

/** Kilit alma için gereken oturum iç durumu. */
interface LockHost {
  db: Connection;
  pid: number;
  /** Bu oturumda tutulan anahtarlar. */
  keys: Set<string>;
  assertAlive(): void;
  markLost(): void;
}

/** Session advisory lock alır (hiç beklemez); advisory lock'lar tek bağlantıda reentrant olduğundan aynı anahtarın yerel ikinci
 * sahibi de meşgul sayılır. */
async function acquireAdvisoryLock(host: LockHost, key: string) {
  host.assertAlive();
  if (host.keys.has(key)) throw busy();
  host.keys.add(key);
  let locked = false;
  try {
    const [row] = await host.db.query<{ locked: boolean }>(TRY_LOCK_SQL, [key]);
    locked = row?.locked === true;
    if (!locked) throw busy();
    const lock = heldLock(host, key);
    await lock.assertOwned();
    return lock;
  } catch (error) {
    host.keys.delete(key);
    if (locked) host.markLost();
    throw error;
  }
}

/** Alınmış kilidin denetimleri ve bırakılması; bırakma başarısızsa oturum kayıp sayılır. */
function heldLock(host: LockHost, key: string) {
  let released = false;
  const assertAlive = () => {
    if (released) throw lockLost("Management lock released");
    host.assertAlive();
  };
  const assertOwned = async () => {
    assertAlive();
    const [row] = await host.db.query<{ pid: number; held: boolean }>(LOCK_HELD_SQL, [key]);
    if (row?.pid !== host.pid || !row.held) {
      host.markLost();
      throw lockLost("Management session lost its lock");
    }
  };
  const release = async () => {
    try {
      await assertOwned();
      const [row] = await host.db.query<{ unlocked: boolean }>(UNLOCK_SQL, [key]);
      if (!row?.unlocked) throw lockLost("Management session lost its lock");
      host.keys.delete(key);
      released = true;
    } catch (error) {
      host.markLost();
      throw error;
    }
  };
  return { pid: host.pid, assertOwned, assertAlive, release };
}

/** `watchdogMs`: tek deyimin cevap bekleme sınırı; verilmezse yönetim statement timeout'u + 5 sn (restore bunu saatlik deyimlere uyarlar). */
export type SessionOptions = { applicationName?: string; signal?: AbortSignal; watchdogMs?: number };
export type Session = Awaited<ReturnType<typeof openSession>>;

/**
 * Yönetim zaman aşımlarıyla, hiç yeniden bağlanmayan tek ayrılmış bağlantı (kendi max:1 havuzu). Sürücü kapanış bildirdiğinde,
 * bir sorgu bağlantı hatasıyla düştüğünde ya da watchdog'u aştığında kaybedilir; bekleyen ve sonraki her sorgu reddedilir.
 */
export async function openSession(m: Management, options: SessionOptions = {}) {
  const { url } = m.config;
  // Bağlantı kurulamazsa Bun `onclose`'u `reserve` reddinden önce bildirir: reserve sürerken kapanış kayıp sayılmaz, reddin kodu çıkar.
  const pool = m.driver(url, { max: 1, idleTimeoutSeconds: 0, maxLifetimeSeconds: 0, connectTimeoutSeconds: 10, onClose: () => reserved && liveness.onPoolClose() });
  const liveness = createLiveness(pool, options.watchdogMs ?? m.config.migrationStatementTimeoutMs + WATCHDOG_GRACE_MS);
  const keys = new Set<string>();
  let reserved: Reserved | undefined;
  let pid = 0;

  /** Çalışan deyimi başka bir bağlantıdan durdurur (Bun'ın yerel cancel'ı etkisizdir), sonra oturumu düşürür. */
  function cancel() {
    if (pid && !liveness.signal.aborted)
      void m.pools.primary.pool.query("SELECT pg_cancel_backend($1)", [pid]).catch(() => {});
    liveness.markLost();
  }
  async function close() {
    options.signal?.removeEventListener("abort", cancel);
    if (!liveness.beginClose()) return;
    keys.clear();
    reserved?.release();
    await closePool(pool);
  }

  let db: ReturnType<typeof guardedConnection>;
  try {
    // Sürücü mesajı (host, kullanıcı) yönetim çağıranına da çıkmaz: yalnızca kod (`DriverError`).
    reserved = await liveness.guard(reserveGuarded(pool));
    db = guardedConnection(reserved, liveness);
    pid = await backendPid(db);
    await liveness.guard(assertDirect(m.driver, url, db, pid));
    // Oturum düzeyi ayarlar ancak bağlantının doğrudan olduğu kanıtlandıktan sonra güvenlidir.
    await db.query(SESSION_SETTINGS_SQL, [
      `${m.config.migrationStatementTimeoutMs}ms`,
      `${m.config.migrationLockTimeoutMs}ms`,
      options.applicationName ?? "migration",
    ]);
    options.signal?.addEventListener("abort", cancel, { once: true });
    if (options.signal?.aborted) cancel();
  } catch (error) {
    await close();
    throw error;
  }

  const host: LockHost = { db, pid, keys, assertAlive: liveness.assertAlive, markLost: liveness.markLost };
  const acquire = (key: string) => acquireAdvisoryLock(host, key);
  return { db, pid, acquire, assertAlive: liveness.assertAlive, signal: liveness.signal, close, cancel };
}

/** Bağımsız yönetim komutları ve kurtarma için ayrılmış kilit oturumu. */
export async function openManagementSession(m: Management, key: string, options: SessionOptions = {}) {
  const session = await openSession(m, options);
  try {
    return { ...session, ...(await session.acquire(key)) };
  } catch (error) {
    await session.close();
    throw error;
  }
}
