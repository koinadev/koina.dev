/** Yönetim girişi (`@koina/db/management`): bağlam fabrikası ve CLI'nin sardığı işlemler. */
import { migrationTables, registry } from "./core/migrations/registry";
import { createRunner } from "./core/migrations/runner";
import { prepareQuery as compileQuery } from "./core/sql/compiler";

export type { ManagementOptions } from "./core/config";
export { createManagement, type Management } from "./core/management";
export type { SeedContext } from "./core/migrations/source";

/** Paketin kendi migration ve seed listeleriyle çalışan işlemler. */
export const { baseline, migrate, migrationStatus, rollback, seed } = createRunner(registry);

/** Codegen ile aynı derleme: `*` paketin kendi migration tablolarından açılır, çıktı adları camelCase olur. */
export const prepareQuery = (source: string) => compileQuery(source, migrationTables());
