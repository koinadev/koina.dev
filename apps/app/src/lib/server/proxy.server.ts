import { upstream } from './env.server';

// API'nin işine yarayan istek başlıkları; geri kalanı (Host, CF-* vb.) bilerek aktarılmaz.
const FORWARD = [
  'accept',
  'accept-language',
  'authorization',
  'cf-connecting-ip',
  'content-type',
  'cookie',
  'origin',
  'referer',
  'user-agent',
  'x-captcha-response',
];
// Yanıttan tarayıcıya dönen başlıklar. `set-cookie` ayrıca (birden çok olabilir).
const RETURN = ['content-type', 'cache-control', 'retry-after', 'set-auth-token'];
const BODY_LIMIT = 6 * 1024 * 1024;

const fail = (status: number, code: string) => Response.json({ success: false, code }, { status, headers: { 'cache-control': 'no-store' } });

/**
 * `/api/*` → API `/v1/*`. Tarayıcı API'yi kendi kökünden çağırır; oturum çerezi böylece birinci taraf kalır (workers.dev alt
 * alanları ayrı site sayılır, Safari üçüncü taraf çerezi göndermez). `/api/v1/x` ve `/api/x` aynı yere gider.
 */
export async function proxyApi(request: Request, url: URL): Promise<Response> {
  let path = url.pathname.slice('/api'.length) || '/';
  if (!path.startsWith('/v1/')) path = `/v1${path}`;
  const headers = new Headers();
  for (const name of FORWARD) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  let body: ArrayBuffer | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    // Görsel yüklemesi en çok 5 MB; gövde belleğe alınır ki servis bağlantısı ve fetch aynı biçimde çalışsın.
    const length = Number(request.headers.get('content-length') ?? 0);
    if (length > BODY_LIMIT) return fail(413, 'PAYLOAD_TOO_LARGE');
    body = await request.arrayBuffer();
    if (body.byteLength > BODY_LIMIT) return fail(413, 'PAYLOAD_TOO_LARGE');
  }
  let res: Response;
  try {
    res = await upstream(path + url.search, { method: request.method, headers, body, redirect: 'manual' });
  } catch {
    return fail(502, 'INTERNAL');
  }
  const out = new Headers({ 'x-content-type-options': 'nosniff' });
  for (const name of RETURN) {
    const value = res.headers.get(name);
    if (value) out.set(name, value);
  }
  if (!out.has('cache-control')) out.set('cache-control', 'no-store');
  for (const cookie of res.headers.getSetCookie()) out.append('set-cookie', cookie);
  return new Response(res.status === 204 || request.method === 'HEAD' ? null : res.body, { status: res.status, headers: out });
}
