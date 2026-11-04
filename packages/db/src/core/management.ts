/** Yönetim bağlamı: doğrudan bağlantı havuzu (her iş `SET LOCAL` zaman aşımlarıyla transaction'da) ve schema. İşlemler bu bağlamı alan düz
 * fonksiyonlardır (`@koina/db/management`: `src/management.ts`). */
import { type Config, loadConfig, type ManagementOptions, managementSettings } from "./config";
import { createPools, type SpanHandler, spanner } from "./database";
import type { Driver } from "./driver";
import { DEFAULT_SCHEMA, validateSchema } from "./identifier";

/** Bir çalıştırma tek kilit oturumu ve birkaç yan sorgu kullanır. */
const MANAGEMENT_POOL_MAX = 4;
const MANAGEMENT_MAX_PENDING = 64;

export interface ManagementFactoryOptions extends ManagementOptions {
  driver: Driver;
  /** Migration ve seed'lerin hedef schema'sı; verilmezse `public`. */
  schema?: string;
  /** Ölçüm: işlem adımları (`migration`, `rollback`, `seed`) ve sorgu süreleri. */
  onSpan?: SpanHandler;
}

/** `DATABASE_URLS` doğrudan (veya session pooling) bağlantı olmalı; kilit oturumu açılırken doğrulanır. */
function openManagement(input: Config, { driver, schema = DEFAULT_SCHEMA, onSpan, ...options }: ManagementFactoryOptions) {
  validateSchema(schema);
  const config = managementSettings(input, options);
  const pools = createPools(config, driver, MANAGEMENT_POOL_MAX, {
    deadlineMs: config.migrationStatementTimeoutMs,
    timeouts: { statementTimeoutMs: config.migrationStatementTimeoutMs, lockTimeoutMs: config.migrationLockTimeoutMs },
    maxPending: MANAGEMENT_MAX_PENDING,
    onSpan,
  });
  return {
    config,
    driver,
    schema,
    pools,
    db: pools.primary,
    close: pools.close,
    span: spanner(onSpan),
  };
}
export type Management = ReturnType<typeof openManagement>;

/** Yönetim bağlamı (doğrudan bağlantı). Config verilmezse `DATABASE_URLS` okunur: `createManagement({ driver: bunDriver })`. */
export function createManagement(options: ManagementFactoryOptions): Management;
export function createManagement(config: Config, options: ManagementFactoryOptions): Management;
export function createManagement(configOrOptions: Config | ManagementFactoryOptions, options?: ManagementFactoryOptions): Management {
  return "url" in configOrOptions ? openManagement(configOrOptions, options as ManagementFactoryOptions) : openManagement(loadConfig(), configOrOptions);
}
