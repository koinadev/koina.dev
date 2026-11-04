/** Schema dışa aktarma, yedek ve geri yükleme. Sürücüden bağımsızdır (pg_dump gerekmez): veri `row_to_json` satırları olarak gzip'li
 * JSON Lines, şema katalogdan okunan birebir şekil olarak saklanır (kurallar `copy.ts`'te).
 *
 *   <klasör>/backup.json     şekil, sunucu bilgisi, tablo dosyaları ve satır sayıları (en son yazılır: klasör varsa yedek tamdır)
 *   <klasör>/<n>.jsonl.gz    tablo satırları
 *
 * `export <dir>` tam o klasörü yazar (önce `.partial`, bitince yeniden adlandırılır; var olmamalı). `backup <kök>` her çalıştırmada
 * `<kök>/<UTC yyyyMMddHHmmss>` altına tam bir set yazar ve `keep` ile eskileri siler. `restore` boş ya da olmayan schema'ya kurar. */
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { schemaIsEmpty } from "../catalog";
import { boundedInteger } from "../config";
import type { Connection } from "../driver";
import { AppError, errorCode } from "../errors";
import { qualified } from "../identifier";
import { MIGRATION_KEY, openManagementSession, WATCHDOG_GRACE_MS } from "../locks";
import type { Management } from "../management";
import { registry as packageRegistry, type Registry } from "../migrations/registry";
import { createRunner, noReport, type Report } from "../migrations/runner";
import { migrationPrefix } from "../migrations/source";
import { assertCompatible, buildSchema, insertRows, readRows, readSchema, type SchemaShape, type ServerFacts, serverFacts, snapshotTransaction } from "./copy";
import { batches, openGzipWriter, readLines } from "./jsonl";
import { openReplicaSource, type ReplicaSource } from "./replica-source";

/** 2: şekil `enums` taşır. 1 (enum'suz eski yedek) de okunur. */
const FORMAT = 2;
const RESTORE_BATCH_ROWS = 500;
/** Tek yedek/geri yükleme için statement timeout'u. */
const TRANSFER_TIMEOUT_MS = 60 * 60 * 1000;
const SET_ID = /^\d{14}$/;
/** Aynı saniyede set varsa sonraki saniyeler için toplam deneme. */
const SET_CLAIM_ATTEMPTS = 3;

type TableFile = { name: string; file: string; rows: number };
/** `backup.json` */
export type BackupMeta = {
  format: number;
  schema: string;
  takenAt: string;
  facts: ServerFacts;
  shape: SchemaShape;
  tables: TableFile[];
  /** Veri replica'dan okunduysa: kaynak ve veri okunmadan önce yetişilen replay konumu. */
  source?: "replica";
  replayLsn?: string;
};

const exists = (path: string) => stat(path).then(() => true, () => false);
const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, "utf8")) as T;
const totalRows = (tables: readonly TableFile[]) => tables.reduce((n, t) => n + t.rows, 0);
const tableBatches = (file: string) => batches(readLines(file), RESTORE_BATCH_ROWS);

/** Satırları gzip'li JSON Lines dosyasına yazar; satır sayısını döndürür. */
async function writeTable(from: Connection, relation: string, file: string, signal?: AbortSignal) {
  const writer = openGzipWriter(file);
  try {
    return await readRows(from, relation, (rows) => writer.write(rows.join("\n")), signal);
  } finally {
    await writer.close();
  }
}

const taken = () => new AppError("BACKUP_EXISTS", "The target folder already exists");
const writing = () => new AppError("BACKUP_EXISTS", "Another run is writing the target folder (remove its .partial folder if no run is active)");
/** fs `EEXIST`/`ENOTEMPTY`: klasör (`error()`) var. */
const claimFailed = (error: () => AppError) => (cause: unknown) => {
  throw ["EEXIST", "ENOTEMPTY"].includes(errorCode(cause)) ? error() : cause;
};
/** Sondaki `/` hedefi değiştirmez: `.partial` hedefin içine değil yanına yazılır. */
const partialOf = (dir: string) => `${resolve(dir)}.partial`;

/** Hedef klasör ya da onun yarım `.partial` izi varsa `BACKUP_EXISTS`: yan etkili işlere (ör. Neon branch'i) başlamadan önce çağrılır. */
export async function assertFree(dir: string) {
  if (await exists(dir)) throw taken();
  if (await exists(partialOf(dir))) throw writing();
}

/** Schema'yı `dir` klasörüne yazar (önce `.partial`, bitince yeniden adlandırılır); hata olursa `.partial` silinir, `dir` var olmamalı.
 * `.partial` özyinelemesiz `mkdir` ile yalnızca bu çalıştırmaya alınır: aynı hedefe giden ikinci çalıştırma başkasının klasörünü silmez,
 * `BACKUP_EXISTS` alır; yeniden adlandırma da dolu bir hedefin üzerine yazmaz. */
async function writeSnapshot(m: Management, dir: string, signal?: AbortSignal, replica?: ReplicaSource): Promise<BackupMeta> {
  // Replica birincilin şu anki konumuna yetişir: okunan şema replica'da vardır ve `replayLsn` bu verinin konumunu tanımlar.
  const replayLsn = replica ? await replica.catchUp() : undefined;
  if (await exists(dir)) throw taken();
  const partial = partialOf(dir);
  await mkdir(dirname(partial), { recursive: true });
  await mkdir(partial).catch(claimFailed(writing));
  try {
    const db = replica ? replica.db : m.db;
    const facts = await serverFacts(db);
    const meta = await db.transaction(async (tx): Promise<BackupMeta> => {
      const shape = await readSchema(tx, m.schema);
      const tables: TableFile[] = [];
      for (const [i, table] of shape.tables.entries()) {
        const file = `${i}.jsonl.gz`;
        tables.push({ name: table.name, file, rows: await writeTable(tx, qualified(m.schema, table.name), join(partial, file), signal) });
      }
      return { format: FORMAT, schema: m.schema, takenAt: new Date().toISOString(), facts, shape, tables, ...(replica ? { source: "replica" as const, replayLsn } : {}) };
    }, snapshotTransaction(TRANSFER_TIMEOUT_MS));
    await writeFile(join(partial, "backup.json"), JSON.stringify(meta));
    await rename(partial, resolve(dir)).catch(claimFailed(taken));
    return meta;
  } catch (error) {
    await rm(partial, { recursive: true, force: true });
    throw error;
  }
}

/** Replica verilirse veri oradan okunur; kaynak her çağrıdan sonra kapanır. */
async function withSource<T>(m: Management, replicaUrls: string | undefined, work: (replica?: ReplicaSource) => Promise<T>) {
  const replica = replicaUrls ? await openReplicaSource(m, replicaUrls) : undefined;
  try {
    return await work(replica);
  } finally {
    await replica?.close();
  }
}

/** Schema'nın bütün verisi tek seferde: `dir/backup.json` + tablo dosyaları (tutarlı snapshot). `restore` ile geri yüklenir. */
export async function exportSchema(m: Management, dir: string, options: { signal?: AbortSignal; replicaUrls?: string } = {}) {
  return withSource(m, options.replicaUrls, async (replica) => {
    const meta = await writeSnapshot(m, dir, options.signal, replica);
    return { dir, tables: meta.tables.length, rows: totalRows(meta.tables) };
  });
}

/** `<kök>` altındaki tamamlanmış setler (`backup.json` var), eskiden yeniye. */
async function completeSets(root: string) {
  const names = (await readdir(root).catch(() => [] as string[])).filter((name) => SET_ID.test(name)).sort();
  const complete: string[] = [];
  for (const name of names) if (await exists(join(root, name, "backup.json"))) complete.push(name);
  return complete;
}

/** Her çalıştırma yeni bir tam set yazar: `<kök>/<UTC yyyyMMddHHmmss>`; o saniyenin seti varsa sonraki saniye denenir (art arda yedekler). */
export async function backupSchema(m: Management, root: string, options: { keep?: number | string; signal?: AbortSignal; replicaUrls?: string; now?: () => Date } = {}) {
  const keep = options.keep === undefined ? undefined : boundedInteger(options.keep, "keep", 1000);
  const now = options.now ?? (() => new Date());
  const result = await withSource(m, options.replicaUrls, async (replica) => {
    for (let attempt = 1; ; attempt++) {
      const id = migrationPrefix(now());
      const dir = join(root, id);
      try {
        const meta = await writeSnapshot(m, dir, options.signal, replica);
        return { id, dir, tables: meta.tables.length, rows: totalRows(meta.tables) };
      } catch (error) {
        // O saniyenin seti var ya da başka bir çalıştırma onu yazıyor: sonraki saniye denenir.
        if (errorCode(error) !== "BACKUP_EXISTS" || attempt === SET_CLAIM_ATTEMPTS) throw error;
      }
      await sleep(1005 - (Date.now() % 1000), undefined, { signal: options.signal });
    }
  });
  const pruned = keep === undefined ? [] : (await pruneBackups(root, keep, result.id)).removed;
  return { ...result, pruned };
}

/** Son `keep` tamamlanmış seti tutar; daha eski tamamlanmış setleri siler. Yarım setlere ve başka klasörlere dokunmaz. `current`
 * (aynı çalıştırmanın az önce yazdığı set) saat geri alınıp en eski görünse de silinmez. */
export async function pruneBackups(root: string, keep: number | string, current?: string) {
  const count = boundedInteger(keep, "keep", 1000);
  const sets = await completeSets(root);
  const removed = sets.slice(0, -count).filter((id) => id !== current);
  for (const id of removed) await rm(join(root, id), { recursive: true, force: true });
  return { kept: sets.filter((id) => !removed.includes(id)), removed };
}

/** `source`: `export` klasörü (`backup.json` içerir) ya da yedek kökü (son set ya da `set`). */
async function locateBackup(source: string, set?: string): Promise<string> {
  if (await exists(join(source, "backup.json"))) return source;
  const sets = await completeSets(source);
  const id = set === undefined ? sets.at(-1) : sets.find((name) => name === set);
  if (!id) throw new AppError("BACKUP_NOT_FOUND", set ? "Backup set is missing or incomplete" : "No complete backup found");
  return join(source, id);
}

/** Yedeğin migration ledger'ı bu kodun migration listesinin öneki olmalı (daha yeni kodla alınmış yedek reddedilir). */
async function assertLedgerKnown(dir: string, meta: BackupMeta, registry: Registry) {
  const ledger = meta.tables.find((table) => table.name === "_migrations");
  if (!ledger) throw new AppError("BACKUP_INVALID", "Backup has no migration ledger");
  const applied = new Map<string, string>();
  for await (const rows of tableBatches(join(dir, ledger.file)))
    for (const row of rows) {
      const { id, checksum } = JSON.parse(row) as { id: string; checksum: string };
      applied.set(id, checksum);
    }
  const prefix = registry.migrations.slice(0, applied.size);
  if (prefix.length !== applied.size || prefix.some((migration) => applied.get(migration.id) !== migration.checksum))
    throw new AppError("MIGRATION_DRIFT", "Backup migration history is not a prefix of this code's migrations");
}

/** Tablonun yedek satırlarını batch'ler halinde yükler (her batch öncesi sahiplik doğrulanır) ve satır sayısını denetler. */
async function restoreTableRows(tx: Connection, from: { dir: string; meta: BackupMeta; verify: () => Promise<void> }, relation: string, stored: string[], table: string) {
  const file = from.meta.tables.find((t) => t.name === table);
  if (!file) throw new AppError("BACKUP_INVALID", `Backup has no rows file for ${table}`);
  for await (const rows of tableBatches(join(from.dir, file.file))) {
    await from.verify();
    await insertRows(tx, relation, stored, rows);
  }
  const [count] = await tx.query<{ n: number }>(`SELECT count(*)::integer AS n FROM ${relation}`);
  if (count?.n !== file.rows) throw new AppError("RESTORE_MISMATCH", `${table}: expected ${file.rows} rows, restored ${count?.n}`);
}

export type RestoreOptions = { set?: string; signal?: AbortSignal; report?: Report; registry?: Registry };

/**
 * Yedekten schema'yı kurar. Hedef schema yok ya da boş olmalı (`SCHEMA_NOT_EMPTY`; hiçbir şey silinmez). Şema ve veri tek transaction'da
 * kurulur (yarıda kalırsa hiçbir şey kalmaz, tekrar denenebilir), satır sayıları doğrulanır; yedek eski migration sürümündeyse bekleyen
 * migration'lar sonra uygulanır. Yedek başka bir schema adına da kurulabilir.
 */
export async function restoreSchema(m: Management, source: string, options: RestoreOptions = {}) {
  const registry = options.registry ?? packageRegistry;
  const dir = await locateBackup(source, options.set);
  const meta = await readJson<BackupMeta>(join(dir, "backup.json"));
  if (meta.format !== FORMAT && meta.format !== 1) throw new AppError("BACKUP_INVALID", "Backup format does not match");
  await assertLedgerKnown(dir, meta, registry);
  // Watchdog, transaction'ın saatlik statement_timeout'undan kısa olmamalı: uzun CREATE INDEX / FK doğrulaması LOCK_LOST olmasın.
  const session = await openManagementSession(m, MIGRATION_KEY, { applicationName: "restore", signal: options.signal, watchdogMs: TRANSFER_TIMEOUT_MS + WATCHDOG_GRACE_MS });
  try {
    const verify = async () => {
      await session.assertOwned();
      options.signal?.throwIfAborted();
    };
    await verify();
    if (!(await schemaIsEmpty(session.db, m.schema))) throw new AppError("SCHEMA_NOT_EMPTY", "Restore needs an empty or missing schema; it never overwrites existing objects");
    assertCompatible(meta.facts, await serverFacts(session.db));
    await session.db.transaction(async (tx) => {
      await tx.exec(`SET LOCAL statement_timeout = ${TRANSFER_TIMEOUT_MS}`);
      const from = { dir, meta, verify };
      await buildSchema(tx, m.schema, meta.shape, (relation, stored, table) => restoreTableRows(tx, from, relation, stored, table), options.signal);
    });
  } finally {
    await session.close();
  }
  const { migrations } = await createRunner(registry).migrate(m, { signal: options.signal, report: options.report ?? noReport });
  return { restoredFrom: dir, migrationsApplied: migrations, rows: totalRows(meta.tables) };
}
