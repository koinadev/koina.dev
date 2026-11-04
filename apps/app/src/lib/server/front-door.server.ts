import { env } from 'cloudflare:workers';
import { hasSessionCookie } from '../front-door';
import { serverConfig, upstream } from './env.server';

/** Çerez adı tek başına yetmez: süresi dolmuş oturum /home'a değil siteye gitsin. API'ye yalnız çerez varsa gidilir. */
export async function isSignedIn(request: Request): Promise<boolean> {
  const cookie = request.headers.get('cookie');
  if (!hasSessionCookie(cookie)) return false;
  const res = await upstream('/v1/me', { headers: { cookie: cookie! } }).catch(() => null);
  return !!res?.ok;
}

/** Tanıtım sitesine aktarır. Site durağandır, oturum çerezi ona gitmez; yönlendirme adresi bu kökte kalır. */
export async function proxySite(request: Request, url: URL): Promise<Response> {
  const { siteUrl, dev } = serverConfig();
  // Geliştirmede sitenin betikleri kendi Vite sunucusundan çözülür; aktarılan sayfa bu kökte çalışmaz.
  if (dev) return new Response(null, { status: 302, headers: { location: `${siteUrl}${url.pathname}${url.search}` } });
  const headers = new Headers(request.headers);
  headers.delete('cookie');
  const target = new Request(`${siteUrl}${url.pathname}${url.search}`, new Request(request, { headers, redirect: 'manual' }));
  const res = await (env.SITE ? env.SITE.fetch(target) : fetch(target));
  const location = res.headers.get('location');
  if (!location?.startsWith(siteUrl)) return res;
  const out = new Response(res.body, res);
  out.headers.set('location', location.slice(siteUrl.length) || '/');
  return out;
}
