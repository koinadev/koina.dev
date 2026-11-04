import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types/env';
import { allowedOrigins } from '../utils/origins';

/**
 * Tarayıcı çağrıları yalnız bilinen kökenlerden; çerezli istekler için `credentials`. Mobil uygulama `Origin` göndermez, CORS'tan
 * etkilenmez. Better Auth'un Bearer belirteci yanıt başlığında döner, tarayıcıya açılır.
 */
export const corsMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const allowed = allowedOrigins(c.env);
  return cors({
    origin: (origin) => (allowed.includes(origin) ? origin : null),
    allowHeaders: ['content-type', 'authorization', 'x-captcha-response'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['set-auth-token'],
    credentials: true,
    maxAge: 86_400,
  })(c, next);
});
