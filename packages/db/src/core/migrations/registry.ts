/** Migration ve seed kayıtları ve ledger drift kuralı. Seam: SQL/TS dosyaları core dışındadır; core onları yalnızca üretilmiş
 * `src/migrations/index.gen.ts` ve `src/seeds/index.gen.ts` listelerinden alır. */
import migrationList from "../../migrations/index.gen";
import seedList from "../../seeds/index.gen";
import type { Connection } from "../driver";
import { AppError } from "../errors";
import { foldTables } from "../sql/tables";
import { compileMigrations, compileSeeds, type Migration, type Seed } from "./source";

export type { Migration, Seed } from "./source";
export interface Registry {
  readonly migrations: readonly Migration[];
  readonly seeds: readonly Seed[];
}
export const migrations = compileMigrations(migrationList);
export const seeds = compileSeeds(seedList);
export const registry: Registry = { migrations, seeds };
/** Katlanmış migration tabloları: `prepareQuery` codegen ile aynı kaynaktan `*` açar. */
export const migrationTables = () => foldTables(migrations.flatMap((migration) => migration.up.statements)).tables;

export type AppliedMigration = { id: string; checksum: string };
type DriftCode = "MIGRATION_DRIFT" | "SEED_DRIFT";

/** Registry'nin kalan soneki; bilinmeyen, değişmiş, tekrarlanan veya sırası bozuk her geçmiş drift'tir (`code`). */
export function pendingMigrations<T extends AppliedMigration>(applied: readonly AppliedMigration[], list: readonly T[], code: DriftCode = "MIGRATION_DRIFT"): readonly T[] {
  for (const { id, checksum } of applied)
    if (list.find((migration) => migration.id === id)?.checksum !== checksum) throw new AppError(code, `Unknown or modified migration: ${id}`);
  const appliedIds = new Set(applied.map((entry) => entry.id));
  if (appliedIds.size !== applied.length) throw new AppError(code, "Duplicate migration history");
  const pending = list.filter((migration) => !appliedIds.has(migration.id));
  // Uygulanmış geçmiş listenin öneki olmalı: ilk bekleyen migration'dan sonra uygulanmış bir şey olamaz.
  if (list.slice(list.length - pending.length).some((migration) => appliedIds.has(migration.id))) throw new AppError(code, "Migration history contains a gap");
  return pending;
}

/** Sabit, tırnaklı `ledger` tablosu. */
export const createLedger = (ledger: string) =>
  `CREATE TABLE IF NOT EXISTS ${ledger} (id text PRIMARY KEY,checksum text NOT NULL,completed_at timestamptz NOT NULL DEFAULT now())`;

/** Ledger'ı okur ve listenin bekleyen sonekini döndürür; `missingOk`: tablo yoksa hepsi bekler. */
export async function pendingIn<T extends AppliedMigration>(
  db: Connection,
  ledger: string,
  list: readonly T[],
  { code, missingOk }: { code?: DriftCode; missingOk?: boolean } = {},
): Promise<readonly T[]> {
  if (missingOk) {
    const [table] = await db.query<{ exists: boolean }>("SELECT to_regclass($1) IS NOT NULL AS exists", [ledger]);
    if (!table?.exists) return list;
  }
  const rows = await db.query<AppliedMigration>(`SELECT id,checksum FROM ${ledger} ORDER BY id`);
  return pendingMigrations(rows, list, code);
}

/** Geri alınacaklar: son `steps` (varsayılan 1) migration veya `to` son uygulanmış kalacak şekilde sonrakiler. */
export type RollbackTarget = { steps?: number; to?: string };

/** Uygulanmış önek → geri alma sırası (yeniden eskiye); bilinmeyen hedefleri ve geri alınamaz migration'ları DDL'den önce reddeder. */
export function rollbackTargets(applied: readonly Migration[], { steps, to }: RollbackTarget): Migration[] {
  if (steps !== undefined && to !== undefined) throw new AppError("USAGE", "Use either steps or to");
  let count = steps ?? 1;
  if (to !== undefined) {
    const index = applied.findIndex((migration) => migration.id === to);
    if (index < 0) throw new AppError("MIGRATION_NOT_APPLIED", "The --to target is not an applied migration");
    count = applied.length - 1 - index;
  } else if (!Number.isSafeInteger(count) || count < 1 || count > applied.length)
    throw new AppError("USAGE", `steps must be between 1 and the ${applied.length} applied migrations`);
  const targets = applied.slice(applied.length - count).reverse();
  const irreversible = targets.find((migration) => !migration.down);
  if (irreversible) throw new AppError("MIGRATION_IRREVERSIBLE", `${irreversible.id} has an empty --down section and cannot be rolled back`);
  return targets;
}
