import { CAPTCHA_HEADER } from '@koina/shared/api';
import type { Db } from '@koina/db';
import { authTables, createAuth as createDbAuth, rateLimitTable } from '@koina/db/auth';
import { findMemberById } from '@koina/db/repositories/members';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { bearer, emailOTP } from 'better-auth/plugins';
import type { AppContext } from '../types/env';
import { allowedOrigins } from '../utils/origins';
import { verifyTurnstile } from '../utils/turnstile';
import { nameFromEmail, uniqueHandle } from './handle';
import { deliverOtp, OTP_MINUTES } from './otp-mail';

export const AUTH_BASE_PATH = '/v1/auth';
const SESSION_DAYS = 90;
const SEND_CODE_PATH = '/email-otp/send-verification-otp';

const localeOf = (headers: Headers | undefined): 'tr' | 'en' =>
  headers?.get('accept-language')?.toLowerCase().startsWith('en') ? 'en' : 'tr';

/**
 * Better Auth örneği. Tablolar ve bağdaştırıcı `@koina/db/auth`'tan gelir; Workers'ta veritabanı istek başına açıldığı için örnek de
 * istek başına kurulur.
 *
 * - Giriş yalnız e-posta koduyladır (şifre yok). Kod veritabanında özetlenmiş saklanır, 5 hatalı denemede geçersizleşir.
 * - Web çerezle (HttpOnly, SameSite=Lax, https'te Secure), mobil `bearer` ile çalışır.
 * - Tarayıcıdan (Origin başlığı olan) kod isteği Turnstile ister; mobilde hız sınırı ve hesap güven düzeyi korur.
 * - Uzaklaştırılmış üye için oturum açılmaz.
 */
export function createAuth(c: AppContext, db: Db) {
  const env = c.env;
  const build = createDbAuth(
    db,
    ({ options }) =>
      betterAuth({
        ...options,
        ...authTables(),
        user: {
          ...authTables().user,
          additionalFields: {
            handle: { type: 'string', required: false, input: false },
            locale: { type: 'string', required: false, input: false },
          },
        },
        trustedOrigins: allowedOrigins(env),
        telemetry: { enabled: false },
        session: { ...authTables().session, expiresIn: SESSION_DAYS * 86_400, updateAge: 86_400 },
        rateLimit: {
          enabled: true,
          storage: 'database',
          ...rateLimitTable(),
          window: 60,
          max: 60,
          customRules: {
            [SEND_CODE_PATH]: { window: 3600, max: 10 },
            '/sign-in/email-otp': { window: 3600, max: 30 },
          },
        },
        plugins: [
          emailOTP({
            otpLength: 6,
            expiresIn: OTP_MINUTES * 60,
            allowedAttempts: 5,
            storeOTP: 'hashed',
            sendVerificationOTP: ({ email, otp }, ctx) =>
              deliverOtp(env, c.get('db'), c.get('defer'), { email, otp, locale: localeOf(ctx?.headers) }),
          }),
          bearer(),
        ],
        hooks: {
          before: createAuthMiddleware(async (ctx) => {
            if (ctx.path !== SEND_CODE_PATH || !ctx.headers?.get('origin')) return;
            const ok = await verifyTurnstile(env, ctx.headers.get(CAPTCHA_HEADER) ?? '', ctx.headers.get('cf-connecting-ip') ?? undefined);
            if (ok === false) throw new APIError('BAD_REQUEST', { code: 'TURNSTILE_FAILED', message: 'Captcha failed' });
          }),
        },
        databaseHooks: {
          user: {
            create: {
              before: async (user, ctx) => ({
                data: {
                  ...user,
                  name: nameFromEmail(user.email),
                  handle: await uniqueHandle(c.get('db'), user.email),
                  locale: localeOf(ctx?.headers),
                },
              }),
            },
          },
          session: {
            create: {
              before: async (session) => {
                const member = await findMemberById(c.get('db'), String(session.userId));
                if (member?.bannedAt) throw new APIError('FORBIDDEN', { code: 'BANNED', message: 'Account is suspended' });
              },
            },
          },
        },
        advanced: {
          ...options.advanced,
          defaultCookieAttributes: { sameSite: 'lax', httpOnly: true },
          // Cloudflare istemci adresini bu başlıkta verir; `x-forwarded-for` istemciden gelebilir.
          ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
          disableOriginCheck: false,
        },
      }),
    { secret: env.BETTER_AUTH_SECRET ?? '', baseURL: env.API_URL, basePath: AUTH_BASE_PATH, cookiePrefix: 'koina' },
  );
  return build();
}

export type Auth = ReturnType<typeof createAuth>;
