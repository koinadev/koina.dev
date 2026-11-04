/** Runtime girişi (`@koina/db`): uygulamanın ihtiyaç duyduğu küçük yüzey. Yönetim, parser, araçlar ve sürücü modüllerini yüklemez;
 * sürücü `@koina/db/drivers/bun|postgres|pg|neon`, istek kapsamı `@koina/db/middleware`, telemetri `@koina/db/telemetry`
 * girişindedir. */
export type { Config, DatabaseOptions } from "./core/config";
export { createConfig, loadConfig } from "./core/config";
export type { Queryable, ReadContext } from "./core/context";
export type { Span, SpanHandler } from "./core/database";
export type { Driver } from "./core/driver";
export { AppError, databaseUnavailable, errorCode } from "./core/errors";
export { DEFAULT_SCHEMA } from "./core/identifier";
export { createDb, type Db, type DbOptions } from "./core/runtime";
export type { PreparedQuery } from "./core/sql/query";
