import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types/env';
import { fail } from '../utils/errors';
import { allowedOrigins } from '../utils/origins';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF koruması: çerezle gelen durum değiştiren istek, izinli bir kökenden gelmek zorunda. SameSite=Lax zaten başka siteden POST'ta
 * çerez göndermez; bu ikinci kat. Bearer belirteçli istek (mobil) çerez taşımaz, bu denetimden geçmez. Better Auth kendi köken
 * denetimini yapar.
 */
export const originGuard = createMiddleware<AppEnv>(async (c, next) => {
  const usesCookie = (c.req.header('cookie') ?? '').includes('koina.session_token');
  if (!SAFE.has(c.req.method) && usesCookie && !c.req.header('authorization')) {
    const origin = c.req.header('origin');
    if (!origin || !allowedOrigins(c.env).includes(origin)) fail('FORBIDDEN');
  }
  await next();
});
