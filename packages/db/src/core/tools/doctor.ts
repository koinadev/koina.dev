/** Salt okunur üretim denetimi: doğrudan yönetim bağlantısı, runtime timeout varsayılanları, schema ve migration durumu, replica'lar ve
 * isteğe bağlı pooler kanıtı ile PgBouncer konsolu. Hiçbir şey yazmaz. */
import { schemaExists } from "../catalog";
import { runtimeDatabaseDefaults } from "../config";
import type { Driver } from "../driver";
import { AppError, errorCode } from "../errors";
import { qualified } from "../identifier";
import { openSession } from "../locks";
import type { Management } from "../management";
import { registry as packageRegistry, pendingIn, type Registry } from "../migrations/registry";
import { usesTransactionPooler } from "../pooler";
import { probeReplica } from "../replicas";

/** SQL ile kanıtlanamaz; operatör için doğrulanmamış olarak raporlanır. */
const externalChecks = [
  ["pooled_runtime", "Uygulamanın DATABASE_URLS'i transaction-mode pooler'a gitmeli; doctor --pooled-url ile sınayın (ready() de açılışta sınar)."],
  ["effective_pgbouncer_mode", "PgBouncer kullanılıyorsa uygulamanın kullanıcı/DB pool'ları için transaction modunu SHOW POOLS ile doğrulayın."],
  ["hyperdrive_cache", "Hyperdrive kullanılıyorsa bütün bağlantılarda query caching kapalı olmalı; hesap ayarından doğrulayın."],
  ["deployment", "Hedef ortamda /ready, TLS/ağ erişimini ve uygulamanın aynı schema'yı kullandığını doğrulayın."],
].map(([check, detail]) => ({ check: check as string, status: "unverified" as const, detail: detail as string }));

type Add = (check: string, ok: boolean, detail: string) => void;
type Check = { target: string; check: string; ok: boolean; detail: string };

const DATABASE_ROLE_SETTINGS =
  "SELECT pg_catalog.array_to_string(setconfig, ',') AS settings FROM pg_catalog.pg_db_role_setting WHERE setrole=0 AND setdatabase=(SELECT oid FROM pg_catalog.pg_database WHERE datname=pg_catalog.current_database())";

/** `--pooled-url` sınaması için üst süre. */
const POOLED_PROBE_DEADLINE_MS = 10_000;

/** Yönetim oturumu açılabiliyorsa doğrudan bağlantıdır; `DIRECT_CONNECTION_REQUIRED` dışındaki hatalar denetimi bozar. */
const isDirectConnection = (m: Management) =>
  openSession(m).then(
    (session) => session.close().then(() => true),
    (error) => {
      if (errorCode(error) !== "DIRECT_CONNECTION_REQUIRED") throw error;
      return false;
    },
  );

/** Ledger bütün listeyi içermeli; bekleyen veya sapmış geçmiş `migrate`/inceleme gerektirir. */
async function checkMigrations(m: Management, add: Add, registry: Registry) {
  try {
    const pending = (await pendingIn(m.db, qualified(m.schema, "_migrations"), registry.migrations, { missingOk: true })).map((migration) => migration.id);
    add("migrations", !pending.length, pending.length ? `Bekleyen migration'lar: ${pending.join(", ")}. bun run cli migrate çalıştırın.` : "Migration'lar güncel.");
  } catch (error) {
    if (errorCode(error) !== "MIGRATION_DRIFT") throw error;
    add("migrations", false, "Migration ledger'ı listeyle uyuşmuyor (MIGRATION_DRIFT); elle inceleyin.");
  }
}

async function inspectDatabase(m: Management, add: Add, registry: Registry) {
  add("direct_connection", await isDirectConnection(m), "Yönetim DATABASE_URLS'i doğrudan (veya session pooling) bağlantı olmalı; transaction pooler advisory lock'ları düşürür.");
  const [strings] = await m.db.query<{ on: boolean }>("SELECT current_setting('standard_conforming_strings')='on' AS on");
  add("string_literals", strings?.on === true, "standard_conforming_strings açık olmalı.");
  const [stored] = await m.db.query<{ settings: string | null }>(DATABASE_ROLE_SETTINGS);
  const expected = runtimeDatabaseDefaults(m.config);
  add("runtime_timeouts", expected.every((setting) => stored?.settings?.split(",").includes(setting)), `Runtime timeout'ları DB varsayılanı olmalı (${expected.join(", ")}); migrate çalıştırın, sonra pooler bağlantılarını yenileyin.`);
  const exists = await schemaExists(m.db, m.schema);
  add("schema", exists, exists ? `Schema ${m.schema} var.` : `Schema ${m.schema} yok; bun run cli migrate onu kurar.`);
  await checkMigrations(m, add, registry);
}

/** `--pooled-url`: runtime URL'si bir transaction-mode pooler'a gitmeli; doğrudan bağlantı runtime'da `POOLER_REQUIRED` verir. */
async function inspectPooled(m: Management, url: string, add: Add) {
  const pooled = await usesTransactionPooler(m.driver, url, { deadlineMs: POOLED_PROBE_DEADLINE_MS });
  add("pooled_runtime", pooled, "Runtime DATABASE_URLS transaction-mode pooler'a gitmeli; doğrudan bağlantı runtime'da POOLER_REQUIRED verir.");
}

/** Replica başına salt okunur denetimler: kısa ömürlü tek bağlantı açılır; replica URL'si hiçbir çıktıya girmez. */
async function inspectReplica(m: Management, url: string, add: Add) {
  const replica = m.driver(url, { max: 1, idleTimeoutSeconds: 1, maxLifetimeSeconds: 0, connectTimeoutSeconds: 10 });
  try {
    let probe: Awaited<ReturnType<typeof probeReplica>>;
    try {
      probe = await probeReplica(m.db, replica);
    } catch (error) {
      add("replica_reachable", false, `Replica'ya bağlanılamadı (${errorCode(error)}); URL, ağ ve kimlik bilgilerini kontrol edin.`);
      return;
    }
    add("replica_reachable", true, "Replica erişilebilir.");
    add("replica_in_recovery", probe.inRecovery, "URL gerçekten bir replica'ya gitmeli (pg_is_in_recovery); primary'yi replica diye vermek okuma/yazma ayrımını bozar.");
    const lag = probe.lagMs === null ? "bilinmiyor" : `${probe.lagMs} ms`;
    add("replica_lag", probe.lagMs !== null && probe.lagMs <= m.config.replicaMaxLagMs, `Replica lag'i ${m.config.replicaMaxLagMs} ms eşiğinin altında olmalı (ölçülen: ${lag}).`);
    const [stored] = await replica.query<{ settings: string | null }>(DATABASE_ROLE_SETTINGS);
    const expected = runtimeDatabaseDefaults(m.config);
    add("replica_runtime_timeouts", expected.every((setting) => stored?.settings?.split(",").includes(setting)), `Runtime timeout'ları replika ile gelir (${expected.join(", ")}); primary'de migrate çalıştırın.`);
  } finally {
    await replica.close(1000);
  }
}

async function inspectPgBouncer(adminUrl: string, consoleDriver: Driver | undefined, add: Add) {
  const url = URL.parse(adminUrl);
  if (!url || !["postgres:", "postgresql:"].includes(url.protocol) || url.pathname !== "/pgbouncer" || url.search)
    throw new AppError("INVALID_CONFIG", "PgBouncer admin URL must be postgres://…/pgbouncer");
  // Yönetim konsolu transaction kabul etmez: ham, tek bağlantılı pool.
  const driver = consoleDriver ?? (await import("../drivers/bun")).bunDriver;
  const adminConsole = driver(url.href, { max: 1, idleTimeoutSeconds: 5, maxLifetimeSeconds: 30, connectTimeoutSeconds: 10 });
  try {
    const settings = await adminConsole.query<{ key: string; value: string | null }>("SHOW CONFIG");
    const mode = settings.find((row) => row.key === "pool_mode")?.value;
    add("global_pool_mode", mode === "transaction", "Genel pool_mode transaction olmalı. DB/user override'ları ayrıca SHOW POOLS üzerinden denetlenmeli.");
  } finally {
    await adminConsole.close(1000);
  }
}

export interface DoctorOptions {
  /** PgBouncer yönetim konsolu URL'si (postgres://…/pgbouncer). */
  pgbouncerUrl?: string;
  /** Uygulamanın runtime URL'si: transaction-mode pooler'a gittiği kanıtlanır. */
  pooledUrl?: string;
  /** PgBouncer konsol istemcisi; varsayılan Bun SQL (araçlar Bun'da çalışır ve postgres.js'in başlangıç tip sorgularını konsol reddeder). */
  consoleDriver?: Driver;
  /** Migration listesi; varsayılan paketin kendi kaydı (testler kendi listesini verir). */
  registry?: Registry;
}

export async function doctor(m: Management, options: DoctorOptions = {}) {
  const checks: Check[] = [];
  /** Tek hedefi denetler; sürücü hataları kimlik bilgisi içerebildiğinden hata, ayrıntısı gizlenmiş bir denetim olur. */
  async function inspect(target: string, run: (add: Add) => Promise<void>) {
    const add: Add = (check, ok, detail) => checks.push({ target, check, ok, detail });
    try {
      await run(add);
    } catch (error) {
      add("inspection", false, `Denetim tamamlanamadı (${errorCode(error)}). Bağlantı ve yetkileri kontrol edin.`);
    }
  }

  await inspect("database", (add) => inspectDatabase(m, add, options.registry ?? packageRegistry));
  const { pooledUrl, pgbouncerUrl, consoleDriver } = options;
  if (pooledUrl !== undefined) await inspect("database", (add) => inspectPooled(m, pooledUrl, add));
  for (const [index, url] of m.config.replicas.entries()) await inspect(`replica#${index + 1}`, (add) => inspectReplica(m, url, add));
  if (pgbouncerUrl !== undefined) await inspect("pgbouncer", (add) => inspectPgBouncer(pgbouncerUrl, consoleDriver, add));
  return {
    ok: checks.every((c) => c.ok),
    checks,
    externalChecks: pooledUrl === undefined ? externalChecks : externalChecks.filter((item) => item.check !== "pooled_runtime"),
  };
}
