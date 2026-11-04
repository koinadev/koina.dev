import postgres from 'postgres';
import { createApp } from '../src/app';
import type { Env } from '../src/core/types/env';

// Bütünleşik test düzeni: uygulama süreç içinde çalışır (Bun), veritabanı gerçek Postgres'tir (`koina_test`, PgBouncer üzerinden,
// canlıdaki Hyperdrive gibi transaction kipi). R2 bellekte taklit edilir. Altyapı: `bun run --filter @koina/db infra:up`.

export const DIRECT_URL = process.env.TEST_DATABASE_URL ?? 'postgres://admin:local_admin_password@127.0.0.1:46560/koina_test';
const POOLED_URL = process.env.TEST_POOLED_URL ?? 'postgres://admin:local_admin_password@127.0.0.1:46563/koina_test';

export const APP_ORIGIN = 'http://localhost:5173';

class MemoryBucket {
  objects = new Map<string, { body: Uint8Array; type: string }>();
  async put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string } }) {
    this.objects.set(key, { body: new Uint8Array(value), type: options?.httpMetadata?.contentType ?? '' });
    return {};
  }
  async get(key: string) {
    const o = this.objects.get(key);
    return o ? { body: new Blob([o.body]).stream(), httpEtag: `"${key}"` } : null;
  }
  async delete(keys: string | string[]) {
    for (const k of Array.isArray(keys) ? keys : [keys]) this.objects.delete(k);
  }
}

export const media = new MemoryBucket();

export const env: Env = {
  HYPERDRIVE: { connectionString: POOLED_URL } as Hyperdrive,
  MEDIA: media as unknown as R2Bucket,
  ENVIRONMENT: 'development',
  ALLOWED_ORIGINS: APP_ORIGIN,
  API_URL: 'http://localhost:8787',
  MAIL_FROM: 'Koina <info@koina.dev>',
  SITE_URL: 'https://koina.dev',
  BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret-0123456789',
  ADMIN_TOKEN: 'test-admin',
  HASH_SALT: 'test',
  FEATURE_GATES: 'off',
};

const app = createApp();
let ipCounter = 0;
const nextIp = () => `10.1.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;

export interface Call {
  token?: string;
  cookie?: string;
  origin?: string;
  ip?: string;
  headers?: Record<string, string>;
}

export async function call(method: string, path: string, body?: unknown, opts: Call = {}): Promise<Response> {
  const headers = new Headers(opts.headers);
  headers.set('cf-connecting-ip', opts.ip ?? nextIp());
  if (opts.token) headers.set('authorization', `Bearer ${opts.token}`);
  if (opts.cookie) headers.set('cookie', opts.cookie);
  if (opts.origin) headers.set('origin', opts.origin);
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers.set('content-type', 'application/json');
    payload = JSON.stringify(body);
  }
  return app.fetch(new Request(`http://localhost:8787${path}`, { method, headers, body: payload }), env);
}

export const json = async <T = Record<string, unknown>>(res: Response): Promise<T> => (await res.json()) as T;

/** E-posta koduyla giriş (geliştirme posta kutusundan kod okunur); mobil gibi Bearer belirteci döner. */
export async function signIn(email: string): Promise<string> {
  const sent = await call('POST', '/v1/auth/email-otp/send-verification-otp', { email, type: 'sign-in' });
  if (sent.status !== 200) throw new Error(`send ${sent.status} ${await sent.text()}`);
  const { code } = await json<{ code: string }>(await call('GET', `/v1/dev/otp?email=${encodeURIComponent(email)}`));
  const res = await call('POST', '/v1/auth/sign-in/email-otp', { email, otp: code });
  if (res.status !== 200) throw new Error(`verify ${res.status} ${await res.text()}`);
  const token = res.headers.get('set-auth-token');
  if (!token) throw new Error('no set-auth-token');
  return token;
}

/** Doğrudan bağlantı: test verisini hazırlamak ve sıfırlamak için (uygulama kodu bunu kullanmaz). */
export const sql = postgres(DIRECT_URL, { max: 2, onnotice: () => undefined, connection: { statement_timeout: 60_000 } });

/** Kökten silme: üye satırı gönderileri, projeleri, bağlantıları ve oturumları yabancı anahtarla götürür. TRUNCATE yerelde yavaş. */
export async function resetDatabase(): Promise<void> {
  for (const table of ['users', 'events', 'submissions', 'subscribers', 'hits', 'api_rate_limits', 'dev_mailbox', 'link_previews', 'rate_limit', 'verification', 'moderation_log', 'feature_unlocks']) {
    await sql.unsafe(`DELETE FROM "${table}"`);
  }
}

/** Yeni hesabı olağan güvene çeker (yeni hesap sınırları dışındaki senaryolar için). */
export async function trust(email: string, level = 1): Promise<void> {
  await sql`UPDATE users SET trust = ${level} WHERE email = ${email}`;
}
