/** `--from-replica` kaynağı: gizli girişten gelen tek doğrudan replica URL'si. Doğrulanır: doğrudan bağlantı (pooler değil), gerçekten
 * replica (`pg_is_in_recovery`), lag eşiğin altında. Veri okuması yalnızca bu replica'dan yapılır. Mesajlar URL, host, kullanıcı içermez. */
import { setTimeout } from "node:timers/promises";
import { createConfig } from "../config";
import { connect, type Database } from "../database";
import { AppError, databaseUnavailable, driverError, errorCode } from "../errors";
import type { Management } from "../management";
import { usesTransactionPooler } from "../pooler";
import { probeReplica } from "../replicas";

const DIRECT_PROBE_DEADLINE_MS = 10_000;
/** Standby'ın çakışma sayaçları (örnek başına, replike edilmez): bir okuma sırasında arttıysa bağlantıyı çakışma kesmiştir. */
const CONFLICTS =
  "SELECT (confl_tablespace + confl_lock + confl_snapshot + confl_bufferpin + confl_deadlock)::pg_catalog.text AS n FROM pg_catalog.pg_stat_database_conflicts WHERE datname = pg_catalog.current_database()";
const PRIMARY_LSN = "SELECT pg_catalog.pg_current_wal_lsn()::text AS lsn";
const REPLAYED_UP_TO = "SELECT pg_catalog.pg_last_wal_replay_lsn() >= $1::pg_catalog.pg_lsn AS ok, pg_catalog.pg_last_wal_replay_lsn()::pg_catalog.text AS lsn";
const CATCH_UP_POLL_MS = 100;

export interface ReplicaSource {
  /** Mutlak veri kaynağı: çakışma hataları `REPLICA_CONFLICT` olarak eşlenmiş replica bağlantısı. */
  readonly db: Database;
  /** Birincilin şu anki WAL konumunu replica replay edene kadar bekler (en çok `replicaMaxLagMs`, sonra `REPLICA_LAG_EXCEEDED`) ve
   * replica'nın o andaki konumunu döndürür: okunan şemanın replica'ya ulaştığını ve verinin tazeliğini kanıtlar. */
  catchUp(): Promise<string>;
  close(): Promise<void>;
}

/** Uzun snapshot'ı replica'da recovery çakışması iptal edebilir (`max_standby_streaming_delay`): SQLSTATE 40001 ve "conflict with recovery". */
export function replicaConflict(error: unknown): unknown {
  const message = error instanceof Error ? error.message : "";
  if (errorCode(error) === "40001" && /conflict with recovery/i.test(message))
    return new AppError("REPLICA_CONFLICT", "The replica canceled the read because of a recovery conflict; retry or take the export from the primary");
  return error;
}

const conflictCount = async (db: Database) => Number((await db.query<{ n: string }>(CONFLICTS))[0]?.n ?? 0);
/** Standby snapshot tutan boştaki bağlantıyı sonlandırdığında sürücüler yalnızca genel bir bağlantı hatası verir (kodsuz ya da
 * `CONNECTION_CLOSED`). Uygulama hataları, dosya sistemi hataları ve anlamlı SQLSTATE'li SQL hataları çakışma sayılmaz. */
const maybeConflict = (error: unknown) => !(error instanceof AppError) && (databaseUnavailable(error) || errorCode(error) === "OPERATION_FAILED");

/** Replica bağlantısı: SQLSTATE 40001 çakışması `REPLICA_CONFLICT` olur (sorgu, exec ve transaction yollarında). Transaction'da ayrıca,
 * başlangıçta okunan standby çakışma sayacı hata anında arttıysa (sürücü SQLSTATE'i vermese de) neden çakışmadır. */
function mapConflicts(db: Database): Database {
  const rethrow = (error: unknown): never => {
    throw replicaConflict(error);
  };
  return {
    ...db,
    query: ((text: string, params?: readonly unknown[]) => db.query(text, params).catch(rethrow)) as Database["query"],
    exec: (sql) => db.exec(sql).catch(rethrow),
    transaction: (async (work, options) => {
      const before = await conflictCount(db).catch(() => undefined);
      try {
        return await db.transaction(work, options);
      } catch (error) {
        const mapped = replicaConflict(error);
        if (mapped === error && before !== undefined && maybeConflict(error) && (await conflictCount(db).catch(() => before)) > before)
          throw replicaConflict(Object.assign(new Error("conflict with recovery"), { code: "40001" }));
        throw mapped;
      }
    }) as Database["transaction"],
  };
}

/** `entry`: tek doğrudan replica URL'si (düz URL; birincil URL'si ve listeler reddedilir). */
export async function openReplicaSource(m: Management, entry: string): Promise<ReplicaSource> {
  // Birincil URL'si ve liste env adını değil seçeneği anlatan mesajla reddedilir; biçimi `createConfig` doğrular.
  const wrong = () => new AppError("INVALID_CONFIG", "--from-replica takes exactly one direct replica URL, not the primary's");
  if (entry.split(",").some((part) => part.trim() === m.config.url)) throw wrong();
  const [url, extra] = createConfig(m.config.url, entry).replicas;
  if (!url || extra) throw wrong();
  const { migrationStatementTimeoutMs, migrationLockTimeoutMs, replicaMaxLagMs } = m.config;
  // Yoklama ham sürücü hatası verir (mesajda host olabilir): yalnızca koduyla çıkar.
  const pooled = await usesTransactionPooler(m.driver, url, { deadlineMs: DIRECT_PROBE_DEADLINE_MS }).catch((error: unknown) => {
    throw driverError(error);
  });
  if (pooled)
    throw new AppError("DIRECT_CONNECTION_REQUIRED", "The replica URL must be a direct connection, not a transaction pooler");
  const db = connect(m.driver(url, { max: 2, idleTimeoutSeconds: 60, maxLifetimeSeconds: 0, connectTimeoutSeconds: 10 }), {
    deadlineMs: migrationStatementTimeoutMs,
    timeouts: { statementTimeoutMs: migrationStatementTimeoutMs, lockTimeoutMs: migrationLockTimeoutMs },
    maxPending: 64,
  });
  try {
    const probe = await probeReplica(m.db, db);
    if (!probe.inRecovery) throw new AppError("INVALID_CONFIG", "The replica URL does not point at a replica");
    if (probe.lagMs === null || probe.lagMs > replicaMaxLagMs) throw new AppError("REPLICA_LAG_EXCEEDED", `The replica is behind by more than ${replicaMaxLagMs} ms`);
  } catch (error) {
    await db.close().catch(() => {});
    throw error;
  }
  return {
    db: mapConflicts(db),
    async catchUp() {
      const [position] = await m.db.query<{ lsn: string }>(PRIMARY_LSN);
      const deadline = Date.now() + replicaMaxLagMs;
      for (;;) {
        const [row] = await db.query<{ ok: boolean | null; lsn: string }>(REPLAYED_UP_TO, [position?.lsn]);
        if (row?.ok) return row.lsn;
        if (Date.now() >= deadline) throw new AppError("REPLICA_LAG_EXCEEDED", `The replica did not catch up within ${replicaMaxLagMs} ms`);
        await setTimeout(CATCH_UP_POLL_MS);
      }
    },
    close: () => db.close(),
  };
}
