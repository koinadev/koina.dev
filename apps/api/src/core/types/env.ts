import type { MemberRow } from '@koina/db/repositories/members';
import type { RequestDb } from '@koina/db/middleware';
import type { Context } from 'hono';
import type { Auth } from '../auth/create-auth';

/** Worker bağlamaları, değişkenler ve sırlar (wrangler.toml, `.dev.vars`). */
export interface Env {
  HYPERDRIVE: Hyperdrive;
  MEDIA: R2Bucket;
  AI?: Ai;
  ENVIRONMENT: 'production' | 'development';
  ALLOWED_ORIGINS: string;
  API_URL: string;
  MAIL_FROM: string;
  SITE_URL: string;
  AI_MODERATION?: string;
  /** `off`: üye eşikleri yok sayılır, her şey açık (yerel geliştirme ve testler). */
  FEATURE_GATES?: string;
  BETTER_AUTH_SECRET: string;
  TURNSTILE_SECRET?: string;
  RESEND_API_KEY?: string;
  ADMIN_TOKEN?: string;
  NOTIFY_WEBHOOK?: string;
  HASH_SALT?: string;
}

export interface Variables {
  /** İstek başına veritabanı kapsamı (`databaseMiddleware`). */
  db: RequestDb;
  /** Better Auth örneği; ilk çağrıda aynı bağlantıyla kurulur. */
  auth: () => Auth;
  /** Girişli üye; girişsizse `null` (`sessionMiddleware`). */
  viewer: MemberRow | null;
  /** Yanıtı bekletmeyen iş: bağlantı bu iş bitene kadar açık kalır. */
  defer: (work: Promise<unknown>) => void;
}

export type AppEnv = { Bindings: Env; Variables: Variables };
export type AppContext = Context<AppEnv>;
