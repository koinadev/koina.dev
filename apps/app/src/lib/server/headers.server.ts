const TURNSTILE = 'https://challenges.cloudflare.com';

/** İstek başına tek kullanımlık betik nonce'u (128 bit). */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/**
 * HTML yanıtının içerik güvenliği politikası. Betikler yalnız bu kökten ve nonce'lu satır içi bloklardan (TanStack'in
 * hidrasyon verisi); Turnstile için Cloudflare'in alanı. Satır içi `style=""` öznitelikleri (avatar renkleri) yüzünden stilde
 * `unsafe-inline` var; stil betik çalıştıramaz. Geliştirmede Vite'in HMR soketi ve http görselleri (yerel API) eklenir.
 */
export function contentSecurityPolicy(nonce: string, opts: { https: boolean; dev: boolean }): string {
  const img = ["'self'", 'https:', 'data:', 'blob:'];
  const connect = ["'self'"];
  if (opts.dev) {
    // Yerel API görselleri http'den gelir (localhost ya da 127.0.0.1).
    img.push('http:');
    connect.push('ws:', 'wss:');
  }
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${TURNSTILE}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${img.join(' ')}`,
    "font-src 'self'",
    `connect-src ${connect.join(' ')}`,
    `frame-src ${TURNSTILE}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (opts.https) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}

/** Her yanıtta olan başlıklar; CSP yalnız HTML'de (JSON ve XML'de anlamı yok). */
export function withSecurityHeaders(
  response: Response,
  opts: { nonce: string; https: boolean; dev: boolean },
): Response {
  const res = new Response(response.body, response);
  const h = res.headers;
  h.set('x-content-type-options', 'nosniff');
  h.set('referrer-policy', 'strict-origin-when-cross-origin');
  h.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()');
  h.set('x-frame-options', 'DENY');
  h.set('cross-origin-opener-policy', 'same-origin');
  if (opts.https) h.set('strict-transport-security', 'max-age=63072000; includeSubDomains');
  if ((h.get('content-type') ?? '').includes('text/html')) {
    h.set('content-security-policy', contentSecurityPolicy(opts.nonce, opts));
    // Sayfa girişli üyeye göre kişisel olabilir: paylaşılan önbellekte tutulmasın.
    if (!h.has('cache-control')) h.set('cache-control', 'private, no-cache');
  }
  return res;
}
