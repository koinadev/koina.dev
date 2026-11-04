import { createMiddleware } from 'hono/factory';
import { secureHeaders } from 'hono/secure-headers';
import type { AppEnv } from '../types/env';

/** API yanıtları belge değildir: çerçevelenmez, tür tahmin edilmez, betik çalıştırmaz. */
export const securityHeaders = secureHeaders({
  contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
  crossOriginResourcePolicy: 'cross-origin',
  crossOriginOpenerPolicy: false,
  referrerPolicy: 'no-referrer',
  xFrameOptions: 'DENY',
});

/**
 * Kişiye özel yanıtlar (alkışladın mı, kaydettin mi) ara belleklerde kalmasın. iOS'un URL önbelleği başlıksız GET yanıtlarını
 * tahminle saklayıp yeni yanıtı gizleyebiliyordu. Herkese açık ve önbelleklenebilir uçlar kendi başlığını yazar.
 */
export const noStore = createMiddleware<AppEnv>(async (c, next) => {
  await next();
  if (c.req.method === 'GET' && !c.res.headers.has('cache-control')) c.header('cache-control', 'private, no-store');
});
