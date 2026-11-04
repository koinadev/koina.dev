/** Better Auth girişi (`@koina/db/auth`): motorun DB havuzu üzerinde kendi Better Auth bağdaştırıcımız (`auth-adapter.ts`), uygulama
 * schema'sına bağlı veritabanı, sabit çerez öneki ve tek örnek. `@koina/db` runtime girişi bu modülü yüklemez. */
import type { DBAdapterInstance } from "better-auth";
import { engineAdapter } from "./auth-adapter";
import { AppError } from "./errors";
import type { Db } from "./runtime";

/** `createDb` sonucu: birincil havuz ve schema yeter. */
export type AuthRuntime = Pick<Db, "pools" | "schema">;

/** `make`'e verilen güvenli varsayılanlar; Better Auth seçeneklerine olduğu gibi yayılır. Kimlikleri veritabanı üretir
 * (`uuid DEFAULT gen_random_uuid()`), bu yüzden `generateId: false`. */
export interface AuthOptions {
  database: DBAdapterInstance;
  secret: string;
  baseURL: string;
  basePath?: string;
  advanced: { cookiePrefix: string; database: { generateId: false } };
}

export interface AuthConfig {
  /** Better Auth secret'ı (≥ 32 karakter). */
  secret: string;
  baseURL: string;
  /** Yol öneki (örn. `/api/auth`); verilmezse Better Auth varsayılanı kalır ve alan eklenmez. */
  basePath?: `/${string}`;
  /** Çerez öneki; sabittir. Varsayılan `auth`. */
  cookiePrefix?: string;
}

const COOKIE_PREFIX = /^[a-z][a-z0-9-]{0,31}$/;

function requireSecret(secret: string): string {
  if (secret.length < 32) throw new AppError("INVALID_CONFIG", "Better Auth secret must have at least 32 characters");
  return secret;
}

/** bcrypt (`$2a$`, `$2b$`, `$2y$`) ve argon2 (`$argon2id$`, `$argon2i$`, `$argon2d$`) hash'leri: başka uygulamalardan aktarılanlar. */
const FOREIGN_HASH = /^\$(?:2[aby]|argon2(?:id|i|d))\$/;

/**
 * Better Auth `emailAndPassword.password`: yeni parolalar Better Auth scrypt ile hash'lenir; başka uygulamadan aktarılmış bcrypt ve argon2
 * hash'leri `Bun.password` ile doğrulanır, böylece kullanıcılar eski parolalarıyla girer. Bun dışında (Workers, Node) bcrypt `bcryptjs`
 * ile doğrulanır; argon2 yalnızca Bun'da.
 */
export const importedPasswords = {
  hash: async (password: string) => (await import("better-auth/crypto")).hashPassword(password),
  verify: async ({ hash, password }: { hash: string; password: string }) => {
    if (!FOREIGN_HASH.test(hash)) return (await import("better-auth/crypto")).verifyPassword({ hash, password });
    if (typeof Bun !== "undefined") return Bun.password.verify(password, hash);
    if (hash.startsWith("$argon2")) throw new AppError("UNSUPPORTED_PASSWORD_HASH", "Imported argon2 hashes need the Bun runtime");
    // $2y$ (PHP) ile $2b$ aynı algoritmadır.
    return (await import("bcryptjs")).compare(password, hash.replace(/^\$2y\$/, "$2b$"));
  },
};

/**
 * Better Auth örneği: tablolar `"<schema>"."users"` … olarak nitelenir (motorun birincil havuzu üzerinden). Tek örnek ilk çağrıda kurulur ve
 * saklanır; `make` `options`'ı yaymalıdır. Workers'ta istek başına kurun.
 */
export function createAuth<A>(runtime: AuthRuntime, make: (auth: { options: AuthOptions }) => A, { secret, baseURL, basePath, cookiePrefix = "auth" }: AuthConfig): () => A {
  if (!COOKIE_PREFIX.test(cookiePrefix)) throw new AppError("INVALID_CONFIG", "cookiePrefix must be 1-32 characters of a-z, 0-9 and hyphens, starting with a letter");
  if (basePath !== undefined && !basePath.startsWith("/")) throw new AppError("INVALID_CONFIG", "basePath must start with /");
  const options: AuthOptions = {
    database: engineAdapter(runtime.pools.primary, runtime.schema),
    secret: requireSecret(secret),
    baseURL,
    ...(basePath ? { basePath } : {}),
    advanced: { cookiePrefix, database: { generateId: false } },
  };
  let auth: A | undefined;
  return () => (auth ??= make({ options }));
}
