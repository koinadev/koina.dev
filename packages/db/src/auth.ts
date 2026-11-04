/** Better Auth girişi (`@koina/db/auth`): Better Auth tabloları uygulama schema'sında (`createAuth`); tablo eşlemesi; başka uygulamadan
 * aktarılmış parola hash'lerinin doğrulanması. */
export { type AuthConfig, type AuthOptions, type AuthRuntime, createAuth, importedPasswords } from "./core/auth";
export { authTables, rateLimitTable, twoFactorTables } from "./core/auth-schema";
