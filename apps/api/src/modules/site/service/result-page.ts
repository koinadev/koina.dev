import type { Env } from '../../../core/types/env';

/** Bülten bağlantılarının açtığı küçük sonuç sayfası; metinler sabit, kullanıcı girdisi içermez. */
export function resultPage(env: Env, ok: boolean, lang: string): Response {
  const tr = lang !== 'en';
  const title = ok ? (tr ? 'Tamamdır!' : 'All set!') : tr ? 'Bağlantı geçersiz' : 'Invalid link';
  const text = ok
    ? tr ? 'İşlemin kaydedildi.' : 'Your change has been saved.'
    : tr ? 'Bu bağlantı geçersiz ya da süresi dolmuş.' : 'This link is invalid or has expired.';
  const home = `${env.SITE_URL}/${tr ? 'tr' : 'en'}`;
  const html = `<!doctype html><html lang="${tr ? 'tr' : 'en'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Koina</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#FBFAF7;color:#1B1F3B;font-family:system-ui,sans-serif;text-align:center;padding:24px"><main><h1 style="font-size:2rem;margin:0 0 8px">${title}</h1><p style="color:#50567A">${text}</p><p><a href="${home}" style="display:inline-block;margin-top:12px;padding:12px 22px;border-radius:999px;background:#FFD23F;color:#1B1F3B;text-decoration:none;font-weight:600">Koina</a></p></main></body></html>`;
  return new Response(html, {
    status: ok ? 200 : 400,
    headers: { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'" },
  });
}
