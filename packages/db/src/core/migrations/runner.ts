/** Tek schema'nın migration ve seed zinciri: ileri, geri alma, baseline, durum. Tek advisory lock aynı anda iki çalıştırmayı önler; her
 * adım yeniden denenebilir (DDL transaction'da, CONCURRENTLY index idempotent), bu yüzden kalıcı marker ya da kurtarma komutu yoktur. */
import { schemaExists } from "../catalog";
import { runtimeDatabaseDefaults } from "../config";
import type { Connection } from "../driver";
import { AppError, errorCode } from "../errors";
import { qualified, quoteIdentifier } from "../identifier";
import { cancelled, MIGRATION_KEY, openManagementSession, ownershipCheck } from "../locks";
import type { Management } from "../management";
import { foldTables } from "../sql/tables";
import { createLedger, type Migration, pendingIn, type Registry, type RollbackTarget, rollbackTargets, type Seed } from "./registry";

type Verify = () => Promise<void>;
/** İlerleme olayları (JSON'a çevrilebilir düz nesneler); CLI bunları yazdırır. */
export type Report = (event: Record<string, unknown>) => void;
export const noReport: Report = () => {};
export interface RunOptions {
  /** Yalnızca ledger okur; kilit, oturum veya yazma yok. */
  dryRun?: boolean;
  signal?: AbortSignal;
  report?: Report;
}
/** Kilit tutan oturumun bağlantısı: transaction'lar oturumun kendi zaman aşımlarını kullanır. */
type SessionConnection = Connection & { transaction<T>(work: (tx: Connection) => Promise<T>): Promise<T> };

/** `work`'ü tek oturum transaction'ında, CONCURRENTLY index DDL'i için ise doğrudan oturumda çalıştırır. */
const runStep = (session: SessionConnection, outsideTransaction: boolean, work: (db: Connection) => Promise<void>) =>
  outsideTransaction ? work(session) : session.transaction(work);

/** Bağlanmış her deyimi, her birinden önce sahipliği doğrulayarak çalıştırır. */
async function execute(db: Connection, statements: readonly string[], verify: Verify) {
  for (const statement of statements) {
    await verify();
    await db.exec(statement);
  }
}

async function indexState(db: Connection, schema: string, name: string) {
  const [index] = await db.query<{ valid: boolean; is_unique: boolean; relation: string }>(
    "SELECT i.indisvalid AS valid,i.indisunique AS is_unique,c.relname AS relation FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid WHERE i.indexrelid=to_regclass($1)",
    [qualified(schema, name)],
  );
  return index;
}

/** CREATE INDEX CONCURRENTLY: aynı tablo ve teklikteki geçerli index kabul edilir, geçersizi yeniden kurulur, diğerleri reddedilir. */
async function applyConcurrentIndex(db: Connection, schema: string, migration: Migration, verify: Verify) {
  const { name, table, unique } = migration.concurrentIndex as NonNullable<Migration["concurrentIndex"]>;
  const existing = await indexState(db, schema, name);
  if (existing) {
    if (existing.relation !== table || existing.is_unique !== unique) throw new AppError("MIGRATION_DRIFT", "Concurrent index definition mismatch");
    if (existing.valid) return;
    await verify();
    await db.exec(`DROP INDEX CONCURRENTLY ${qualified(schema, name)}`);
  }
  await execute(db, migration.up.bind(schema), verify);
  await verify();
  if (!(await indexState(db, schema, name))?.valid) throw new AppError("MIGRATION_INDEX_INVALID", "Concurrent index is invalid");
}

/** Her öğe için `work`; `{ [key]: id, direction }` ile started/succeeded/failed raporlanır. Tamamlanan ID'leri döndürür. */
async function each<T extends { id: string }>(items: readonly T[], key: "migration" | "seed", direction: string, verify: Verify, report: Report, work: (item: T) => Promise<void>) {
  const done: string[] = [];
  for (const item of items) {
    await verify();
    const start = Date.now();
    const event = { [key]: item.id, direction };
    report({ ...event, status: "started" });
    try {
      await work(item);
    } catch (error) {
      report({ ...event, status: "failed", durationMs: Date.now() - start, error: errorCode(error) });
      throw error;
    }
    done.push(item.id);
    report({ ...event, status: "succeeded", durationMs: Date.now() - start });
  }
  return done;
}

/** Katlanmış DDL'in tanımladığı ama canlı schema'da olmayan sütunlar (`tablo.sütun`) ve enum'lar (`type ad`). */
async function missingSchemaObjects(db: Connection, schema: string, expected: ReturnType<typeof foldTables>) {
  const rows = await db.query<{ name: string }>(
    "SELECT table_name || '.' || column_name AS name FROM information_schema.columns WHERE table_schema=$1 UNION ALL SELECT 'type ' || t.typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname=$1 AND t.typtype='e'",
    [schema],
  );
  const live = new Set(rows.map((row) => row.name));
  return [
    ...[...expected.tables].flatMap(([table, columns]) => columns.map((column) => `${table}.${column.name}`)),
    ...[...expected.enums.keys()].map((name) => `type ${name}`),
  ].filter((name) => !live.has(name));
}

/** Schema yoksa kurulur (varsa `CREATE SCHEMA` çalışmaz: `public` için yetki gerekmez); runtime timeout'ları veritabanı varsayılanı olarak
 * yazılır (yeni backend'ler her pooler arkasında alır, mevcutlar yeniden bağlanınca). */
async function prepare(m: Management, db: Connection, verify: Verify) {
  await verify();
  if (!(await schemaExists(db, m.schema))) await db.exec(`CREATE SCHEMA ${quoteIdentifier(m.schema)}`);
  const [database] = await db.query<{ name: string }>("SELECT pg_catalog.current_database() AS name");
  for (const setting of runtimeDatabaseDefaults(m.config)) await db.exec(`ALTER DATABASE ${quoteIdentifier(database?.name ?? "")} SET ${setting.replace("=", " = ")}`);
}

/** Tek migration: DDL ve ledger satırı birlikte commit edilir; CREATE INDEX CONCURRENTLY transaction dışında çalışır. */
function applyMigration(m: Management, session: SessionConnection, verify: Verify, migration: Migration) {
  const ledger = qualified(m.schema, "_migrations");
  return m.span(
    "migration",
    () =>
      runStep(session, !!migration.concurrentIndex, async (db) => {
        if (migration.concurrentIndex) await applyConcurrentIndex(session, m.schema, migration, verify);
        else await execute(db, migration.up.bind(m.schema), verify);
        await verify();
        await db.query(`INSERT INTO ${ledger} (id,checksum) VALUES ($1,$2)`, [migration.id, migration.checksum]);
      }),
    { detail: migration.id },
  );
}

/** Tek geri alma: DROP INDEX CONCURRENTLY transaction dışında çalışır; tamamlanmış düşürmeden sonra tekrar deneme yalnızca ledger satırını siler. */
function rollbackMigration(m: Management, session: SessionConnection, verify: Verify, migration: Migration) {
  const ledger = qualified(m.schema, "_migrations");
  return m.span(
    "rollback",
    () =>
      runStep(session, !!migration.concurrentDrop, async (db) => {
        const drop = !migration.concurrentDrop || (await indexState(session, m.schema, migration.concurrentDrop));
        if (drop) await execute(db, (migration.down as NonNullable<Migration["down"]>).bind(m.schema), verify);
        await verify();
        await db.query(`DELETE FROM ${ledger} WHERE id=$1`, [migration.id]);
      }),
    { detail: migration.id },
  );
}

/** Tek seed ve ledger satırı kendi transaction'ında. */
function applySeed(m: Management, session: SessionConnection, verify: Verify, seed: Seed) {
  const ledger = qualified(m.schema, "_seeds");
  return m.span(
    "seed",
    () =>
      session.transaction(async (tx) => {
        await seed.run(tx, m.schema, verify);
        await verify();
        await tx.query(`INSERT INTO ${ledger} (id,checksum) VALUES ($1,$2)`, [seed.id, seed.checksum]);
      }),
    { detail: seed.id },
  );
}

/** `registry`: uygulamanın migration ve seed listeleri (`src/core/migrations/registry.ts`); testler kendi listesini verir. */
export function createRunner({ migrations, seeds }: Registry) {
  const migrationsLedger = (schema: string) => qualified(schema, "_migrations");
  const seedsLedger = (schema: string) => qualified(schema, "_seeds");
  /** Ledger yoksa hepsi bekler; bilinmeyen ya da değişmiş geçmiş `MIGRATION_DRIFT`. */
  const pendingMigrations = (db: Connection, schema: string) => pendingIn(db, migrationsLedger(schema), migrations, { missingOk: true });
  const pendingSeeds = (db: Connection, schema: string) => pendingIn(db, seedsLedger(schema), seeds, { code: "SEED_DRIFT", missingOk: true });
  const appliedMigrations = async (db: Connection, schema: string) => migrations.slice(0, migrations.length - (await pendingMigrations(db, schema)).length);

  /** Kilidi tutan oturumda çalışır; kilit kaybı başarıdan sonra da hata sayılır. */
  async function withLock<T>(m: Management, options: Pick<RunOptions, "signal">, work: (db: SessionConnection, verify: Verify) => Promise<T>): Promise<T> {
    if (options.signal?.aborted) throw cancelled();
    const session = await openManagementSession(m, MIGRATION_KEY, { applicationName: "migration", signal: options.signal });
    try {
      const result = await work(session.db, ownershipCheck(session.signal, session.assertOwned));
      await session.assertOwned();
      return result;
    } finally {
      await session.close();
    }
  }

  /** Bekleyen migration'lar: kilit, drift denetimi, schema hazırlığı, ledger, sonra sırayla. `dryRun` yalnızca bekleyenleri listeler. */
  async function migrate(m: Management, options: RunOptions = {}) {
    if (options.dryRun) return { dryRun: true as const, migrations: (await pendingMigrations(m.db, m.schema)).map((migration) => migration.id) };
    return withLock(m, options, async (db, verify) => {
      const todo = await pendingMigrations(db, m.schema);
      await prepare(m, db, verify);
      await db.exec(createLedger(migrationsLedger(m.schema)));
      const applied = await each(todo, "migration", "up", verify, options.report ?? noReport, (migration) => applyMigration(m, db, verify, migration));
      return { dryRun: false as const, migrations: applied };
    });
  }

  /** Son `steps` (varsayılan 1) migration ya da `to`'dan sonrakiler, yeniden eskiye. Geri alınamaz ve bilinmeyen hedefler DDL'den önce reddedilir. */
  async function rollback(m: Management, options: RunOptions & RollbackTarget = {}) {
    if (options.dryRun) return { dryRun: true as const, migrations: rollbackTargets(await appliedMigrations(m.db, m.schema), options).map((migration) => migration.id) };
    return withLock(m, options, async (db, verify) => {
      const targets = rollbackTargets(await appliedMigrations(db, m.schema), options);
      const done = await each(targets, "migration", "down", verify, options.report ?? noReport, (migration) => rollbackMigration(m, db, verify, migration));
      return { dryRun: false as const, migrations: done };
    });
  }

  /** `migrationId`'ye kadar bekleyen migration'ları çalıştırmadan uygulanmış sayar; canlı schema katlanmış tablo, sütun ve enum'ları içermezse reddeder. */
  async function baseline(m: Management, migrationId: string, options: Pick<RunOptions, "signal"> = {}) {
    return withLock(m, options, async (db, verify) => {
      await verify();
      if (!(await schemaExists(db, m.schema))) throw new AppError("SCHEMA_MISMATCH", "Schema does not exist; baseline refused");
      await db.exec(createLedger(migrationsLedger(m.schema)));
      const pending = await pendingMigrations(db, m.schema);
      const marked = pending.slice(0, pending.findIndex((migration) => migration.id === migrationId) + 1);
      if (!marked.length) throw new AppError("MIGRATION_NOT_PENDING", "The baseline target is not a pending migration");
      const applied = migrations.length - pending.length + marked.length;
      const missing = await missingSchemaObjects(db, m.schema, foldTables(migrations.slice(0, applied).flatMap((migration) => migration.up.statements)));
      if (missing.length) throw new AppError("SCHEMA_MISMATCH", `Live schema lacks ${missing.slice(0, 20).join(", ")}; baseline refused`);
      await db.transaction(async (tx) => {
        for (const migration of marked) {
          await verify();
          await tx.query(`INSERT INTO ${migrationsLedger(m.schema)} (id,checksum) VALUES ($1,$2)`, [migration.id, migration.checksum]);
        }
      });
      return { migrations: marked.map((migration) => migration.id) };
    });
  }

  /** Salt okunur: uygulanmış sayı ve bekleyen migration'lar (`transactional: false` CONCURRENTLY index'tir). */
  async function migrationStatus(m: Management) {
    const pending = await pendingMigrations(m.db, m.schema);
    return {
      schema: m.schema,
      applied: migrations.length - pending.length,
      pending: pending.map(({ id, concurrentIndex }) => ({ id, transactional: !concurrentIndex })),
    };
  }

  /** Migration'lar güncel olmalı (gerçek çalıştırmada kilit altında denetlenir). Her seed ve ledger satırı kendi transaction'ında commit
   * edilir; uygulanmış seed tekrar çalışmaz. */
  async function seed(m: Management, options: RunOptions = {}) {
    const current = async (db: Connection) => {
      if ((await pendingMigrations(db, m.schema)).length) throw new AppError("MIGRATIONS_PENDING", "Seeds need current migrations; run migrate first");
    };
    if (options.dryRun) {
      await current(m.db);
      return { dryRun: true as const, seeds: (await pendingSeeds(m.db, m.schema)).map((item) => item.id) };
    }
    return withLock(m, options, async (db, verify) => {
      await current(db);
      await verify();
      await db.exec(createLedger(seedsLedger(m.schema)));
      const todo = await pendingSeeds(db, m.schema);
      const done = await each(todo, "seed", "up", verify, options.report ?? noReport, (item) => applySeed(m, db, verify, item));
      return { dryRun: false as const, seeds: done };
    });
  }

  return { migrate, rollback, baseline, migrationStatus, seed };
}
