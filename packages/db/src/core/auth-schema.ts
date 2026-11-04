/** Better Auth tablolarının eşlemesi: snake_case sütunlar, `users` tablosu. Seçeneklere yayılır: `betterAuth({ ...options, ...authTables(),
 * plugins: [twoFactor({ schema: twoFactorTables() })] })`. Veritabanı rate limit'i: `rateLimit: { enabled: true, storage: "database",
 * ...rateLimitTable() }`. Tablolar paketin temel `auth` migration'ındadır. */
const stamps = { createdAt: "created_at", updatedAt: "updated_at" } as const;

/** Better Auth `user`, `session`, `account`, `verification` seçenekleri. */
export function authTables() {
  return {
    user: { modelName: "users", fields: { emailVerified: "email_verified", ...stamps } },
    session: { modelName: "session", fields: { expiresAt: "expires_at", ipAddress: "ip_address", userAgent: "user_agent", userId: "user_id", ...stamps } },
    account: {
      modelName: "account",
      fields: {
        accountId: "account_id",
        providerId: "provider_id",
        userId: "user_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        ...stamps,
      },
    },
    verification: { modelName: "verification", fields: { expiresAt: "expires_at", ...stamps } },
  };
}

/** `twoFactor({ schema })` eklenti eşlemesi. */
export function twoFactorTables() {
  return {
    user: { fields: { twoFactorEnabled: "two_factor_enabled" } },
    twoFactor: {
      modelName: "two_factor",
      fields: { backupCodes: "backup_codes", userId: "user_id", failedVerificationCount: "failed_verification_count", lockedUntil: "locked_until" },
    },
  };
}

/** Better Auth `rateLimit` seçeneğinin tablo eşlemesi (`storage: "database"`). */
export function rateLimitTable() {
  return { modelName: "rate_limit", fields: { lastRequest: "last_request" } };
}
