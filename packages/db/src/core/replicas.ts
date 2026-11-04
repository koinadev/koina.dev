/** Replica sağlığı ve seçimi. Durum (sağlık + lag) `statusMs` boyunca önbellekte kalır; yoklama tembeldir (arka plan zamanlayıcısı yok,
 * Workers'ta yaşamaz) ve aynı replica için eşzamanlı çağrılar tek yoklamayı paylaşır. Önbellek ve dönüş sırası modül düzeyindedir ve
 * yalnızca sayı tutar: Workers'ta istek başına havuz kapansa da durum yaşar. Lag: replay LSN primary'nin LSN'ine ulaştıysa 0, aksi halde
 * son replay edilen commit'ten bu yana geçen süre (commit'siz WAL akarken kısa süre fazla görünebilir; hata yönü güvenlidir). */
import type { Database, Pools } from "./database";
import type { Connection } from "./driver";
import { errorCode } from "./errors";

export type ReplicaStatus = { up: boolean; inRecovery: boolean; lagMs: number | null; at: number; error?: string };
export type StatusCache = Map<string, ReplicaStatus>;
export type ReplicaHandle = { db: Database; markDown(): void };
export type ReplicaReport = { replica: number; up: boolean; inRecovery: boolean; lagMs: number | null; usable: boolean; error?: string };

const sharedCache: StatusCache = new Map();
/** Round-robin sırası: istek başına router kuran Workers'ta her istek 1. replica'dan başlamaz. */
const sharedRotation = { turn: 0 };
const PRIMARY_LSN = "SELECT pg_catalog.pg_current_wal_lsn()::text AS lsn";
const REPLICA_STATE = `SELECT pg_catalog.pg_is_in_recovery() AS in_recovery,
  pg_catalog.pg_last_wal_replay_lsn() >= $1::pg_catalog.pg_lsn AS caught_up,
  (pg_catalog.date_part('epoch', pg_catalog.now() - pg_catalog.pg_last_xact_replay_timestamp()) * 1000)::pg_catalog.float8 AS lag_ms`;

type Lsn = Promise<string | undefined>;
/** Primary'nin şimdiki WAL konumu. */
async function primaryLsn(primary: Connection) {
  const [row] = await primary.query<{ lsn: string }>(PRIMARY_LSN);
  return row?.lsn;
}

/** Primary'nin LSN'i (`lsn`; verilmezse okunur) replica'da karşılaştırılır; ikisi de verilen bağlantılarda çalışır. Router bir turdaki
 * bütün replica'lar için konumu bir kez okur ve her yoklamaya verir. */
export async function probeReplica(primary: Connection, replica: Connection, lsn: Lsn = primaryLsn(primary)): Promise<{ inRecovery: boolean; lagMs: number | null }> {
  const [row] = await replica.query<{ in_recovery: boolean; caught_up: boolean | null; lag_ms: number | null }>(REPLICA_STATE, [await lsn]);
  if (!row) return { inRecovery: false, lagMs: null };
  const lagMs = row.caught_up ? 0 : row.lag_ms === null || row.lag_ms === undefined ? null : Math.max(0, Math.round(Number(row.lag_ms)));
  return { inRecovery: row.in_recovery === true, lagMs };
}

export interface ReplicaRouterOptions {
  pools: Pick<Pools, "primary" | "replica" | "replicaUrls">;
  maxLagMs: number;
  statusMs: number;
  cache?: StatusCache;
  rotation?: { turn: number };
  now?: () => number;
}

export function createReplicaRouter({ pools, maxLagMs, statusMs, cache = sharedCache, rotation = sharedRotation, now = () => performance.now() }: ReplicaRouterOptions) {
  const inflight = new Map<string, Promise<ReplicaStatus>>();
  const usable = (status: ReplicaStatus) => status.up && status.lagMs !== null && status.lagMs <= maxLagMs;
  const down = (error?: string): ReplicaStatus => ({ up: false, inRecovery: false, lagMs: null, at: now(), ...(error ? { error } : {}) });

  /** Bir tur (`pick`, `report`) bütün bayat replica'lar için primary konumunu bir kez okur; hiç yoklama başlamazsa hiç okunmaz. */
  function round() {
    let lsn: Lsn | undefined;
    return () => (lsn ??= primaryLsn(pools.primary));
  }

  /** Yoklamayı (varsa süren) çalıştırır; sonuç önbelleğe yazılır. */
  function refresh(index: number, url: string, position: () => Lsn): Promise<ReplicaStatus> {
    let running = inflight.get(url);
    if (!running) {
      running = probeReplica(pools.primary, pools.replica(index), position())
        .then(
          (probe): ReplicaStatus => ({ up: probe.inRecovery, inRecovery: probe.inRecovery, lagMs: probe.lagMs, at: now() }),
          (error: unknown) => down(errorCode(error)),
        )
        .then((status) => {
          cache.set(url, status);
          inflight.delete(url);
          return status;
        });
      inflight.set(url, running);
    }
    return running;
  }

  /** Taze kayıt varsa senkron döner (sıcak yolda Promise yok). */
  function current(index: number, url: string, position: () => Lsn): ReplicaStatus | Promise<ReplicaStatus> {
    const cached = cache.get(url);
    return cached && now() - cached.at < statusMs ? cached : refresh(index, url, position);
  }

  async function pick(): Promise<ReplicaHandle | undefined> {
    const urls = pools.replicaUrls;
    if (!urls.length) return undefined;
    const position = round();
    const states = urls.map((url, index) => current(index, url, position));
    const statuses = states.some((state) => state instanceof Promise) ? await Promise.all(states) : (states as ReplicaStatus[]);
    const candidates = statuses.flatMap((status, index) => (usable(status) ? [index] : []));
    if (!candidates.length) return undefined;
    const index = candidates[rotation.turn++ % candidates.length] as number;
    return { db: pools.replica(index), markDown: () => void cache.set(urls[index] as string, down()) };
  }

  /** Her replica'yı önbelleğe bakmadan yoklar; çıktıda URL yoktur (`replica`: config sırasına göre 1 tabanlı numara). */
  async function report(): Promise<ReplicaReport[]> {
    const position = round();
    return Promise.all(
      pools.replicaUrls.map(async (url, index): Promise<ReplicaReport> => {
        const status = await refresh(index, url, position);
        return {
          replica: index + 1,
          up: status.up,
          inRecovery: status.inRecovery,
          lagMs: status.lagMs,
          usable: usable(status),
          ...(status.error ? { error: status.error } : {}),
        };
      }),
    );
  }

  return { pick, report };
}
export type ReplicaRouter = ReturnType<typeof createReplicaRouter>;
