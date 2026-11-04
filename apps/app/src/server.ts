import { createServerEntry, createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';
import { isAppPath, isLanding } from './lib/front-door';
import { serverConfig } from './lib/server/env.server';
import { isSignedIn, proxySite } from './lib/server/front-door.server';
import { createNonce, withSecurityHeaders } from './lib/server/headers.server';
import { proxyApi } from './lib/server/proxy.server';

const start = createStartHandler(defaultStreamHandler);

/**
 * Worker'ın giriş noktası ve Koina'nın tek kapısı. Girişli üye ana sayfada /home'a gider, uygulamanın olmayan yollar tanıtım
 * sitesine aktarılır. `/api/*` API'ye aktarılır; geri kalan her şey TanStack Start'a gider. Nonce istek bağlamıyla
 * yönlendiriciye ulaşır (router.tsx), oradan her satır içi betiğe ve CSP başlığına.
 */
export default createServerEntry({
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return proxyApi(request, url);
    if (isLanding(url.pathname) && (await isSignedIn(request))) {
      return new Response(null, { status: 302, headers: { location: '/home', 'cache-control': 'no-store' } });
    }
    if (!isAppPath(url.pathname) && !url.pathname.startsWith('/@')) return proxySite(request, url);
    const nonce = createNonce();
    const response = await start(request, { context: { nonce } });
    return withSecurityHeaders(response, {
      nonce,
      https: url.protocol === 'https:',
      dev: serverConfig().dev,
    });
  },
});
