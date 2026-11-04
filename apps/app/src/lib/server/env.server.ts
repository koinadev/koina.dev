import { env } from 'cloudflare:workers';

const trim = (url: string) => url.replace(/\/+$/, '');

/** Sunucu yapılandırması. Workers'ta ortam istek anında okunur; modül düzeyinde saklanmaz. */
export function serverConfig() {
  return {
    appUrl: trim(env.APP_URL || 'https://koina-app.0furkancolak.workers.dev'),
    siteUrl: trim(env.SITE_URL || 'https://koina-site.0furkancolak.workers.dev'),
    turnstileSiteKey: env.TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
    dev: env.ENVIRONMENT === 'development',
    apiUrl: env.API_URL ? trim(env.API_URL) : null,
  };
}

const DEV_API = 'http://127.0.0.1:8787';

/**
 * API'ye istek. `API_URL` tanımlıysa (yerel) oraya, değilse `API` servis bağlantısına gider; bağlantı internete çıkmaz,
 * API Worker'ını doğrudan çağırır. İkisi de yoksa yerel API varsayılır.
 */
export function upstream(path: string, init: RequestInit): Promise<Response> {
  if (!env.API_URL && env.API) return env.API.fetch(new Request(`https://koina-api${path}`, init));
  return fetch(`${trim(env.API_URL || DEV_API)}${path}`, init);
}
