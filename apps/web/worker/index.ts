// Sitenin tek sunucu ucu: lansmana kadar ön kayıt. Statik sayfaları asset katmanı sunar; buraya yalnız `/api/*` düşer
// (wrangler.toml `run_worker_first`). Kayıt KV'de durur; API ve e-posta altyapısı açılınca bültene çift onayla taşınır.

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  PRESIGNUPS: { get(key: string): Promise<string | null>; put(key: string, value: string, options?: { metadata?: unknown }): Promise<void> };
  TURNSTILE_SECRET?: string;
}

// Onay kutusunun metni değişirse sürüm artar; her kayıt hangi metni onayladığını taşır (KVKK açık rıza kanıtı).
const CONSENT_VERSION = 'on-kayit-2026-11-04-v2';
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

async function verifyTurnstile(secret: string, token: string, ip: string | null): Promise<boolean> {
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const data = (await res.json().catch(() => null)) as { success?: boolean } | null;
  return data?.success === true;
}

async function presignup(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  // Başka sitelerden form göndermeyi kapatır; tarayıcı Origin'i her POST'ta yollar.
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'FORBIDDEN' }, 403);
  const input = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (input?.website) return json({ error: 'INVALID' }, 400);
  if (!EMAIL.test(email) || email.length > 254) return json({ error: 'EMAIL_INVALID' }, 400);
  if (input?.consent !== true) return json({ error: 'CONSENT_REQUIRED' }, 400);
  // Sır yoksa form kapalı: doğrulanmamış kayıt almaktansa hata vermek.
  if (!env.TURNSTILE_SECRET) return json({ error: 'UNAVAILABLE' }, 503);
  const token = typeof input.token === 'string' ? input.token : '';
  if (!token || !(await verifyTurnstile(env.TURNSTILE_SECRET, token, request.headers.get('cf-connecting-ip')))) {
    return json({ error: 'TURNSTILE_FAILED' }, 400);
  }
  const key = `email:${email}`;
  // Aynı adres ikinci kez gelirse ilk onay kaydı korunur; yanıt aynıdır ki listede kim olduğu anlaşılmasın.
  if (!(await env.PRESIGNUPS.get(key))) {
    // Onay metni iki dilde aynı sürümdür; hangi dildekinin onaylandığı ayrıca saklanır.
    const locale = input.locale === 'en' ? 'en' : 'tr';
    const record = { email, consent: CONSENT_VERSION, locale, at: new Date().toISOString() };
    // Aynı kayıt metadata'da da durur: dışa aktarma tek liste çağrısıyla hepsini okur (scripts/export-presignups.ts).
    await env.PRESIGNUPS.put(key, JSON.stringify(record), { metadata: record });
  }
  return json({ success: true });
}

// Lansmana kadar yalnız ön kayıt sayfası yayında: build tüm siteyi üretir ama ziyaretçi yalnız bunları görür.
// Diğer her adres ana sayfaya döner. Lansmanda bu liste ve `run_worker_first = true` kaldırılır.
const PUBLIC_FILES = new Set(['/', '/favicon.svg', '/og-default.png']);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/on-kayit') return presignup(request, env);
    if (PUBLIC_FILES.has(pathname) || pathname.startsWith('/_astro/')) return env.ASSETS.fetch(request);
    return Response.redirect(new URL('/', request.url).href, 302);
  },
};
