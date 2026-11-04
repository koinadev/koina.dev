import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { createIsomorphicFn, getGlobalStartContext } from '@tanstack/react-start';
import { NotFoundPage, RouteError } from './components/states';
import { ApiError } from './lib/api';
import { routeTree } from './routeTree.gen';

/** Sunucuda bu isteğin CSP nonce'u (server.ts üretir); tarayıcıda Start onu `csp-nonce` meta etiketinden okur. */
const requestNonce = createIsomorphicFn()
  .server(() => {
    try {
      return (getGlobalStartContext() as { nonce?: string } | undefined)?.nonce;
    } catch {
      return undefined;
    }
  })
  .client(() => undefined);

/** Her istek (sunucu) ve her sekme (tarayıcı) kendi yönlendiricisini ve sorgu önbelleğini kurar; üyeler arasında veri paylaşılmaz. */
export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // 4xx tekrar denemekle düzelmez (bulunamadı, yetki); yalnız ağ ve sunucu hataları denenir.
        retry: (count, err) => count < 2 && !(err instanceof ApiError && err.status >= 400 && err.status < 500),
        refetchOnWindowFocus: false,
      },
    },
  });
  const nonce = requestNonce();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: 'intent',
    // Önbellek TanStack Query'de; yönlendirici her girişte yükleyiciyi çağırır, sorgu taze ise ağa çıkılmaz.
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: NotFoundPage,
    ...(nonce ? { ssr: { nonce } } : {}),
  });
  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
