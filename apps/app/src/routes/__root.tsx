import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, HeadContent, Outlet, redirect, Scripts } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Layout } from '@/components/Layout';
import { OverlayProvider } from '@/components/overlays';
import { getAppConfig } from '@/lib/config';
import { featureOfPath } from '@/lib/features';
import { t } from '@/lib/i18n';
import { featuresQuery, meQuery } from '@/lib/queries';
import { SITE_NAME } from '@/lib/seo';
import appCss from '@/styles.css?url';

// Ortam yapılandırması değişmez: sunucuda bir kez okunur, sorgu önbelleğiyle tarayıcıya iner, bir daha istenmez.
const configQuery = queryOptions({ queryKey: ['config'], queryFn: () => getAppConfig(), staleTime: Infinity, gcTime: Infinity });

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Her gezinmede çalışır ama ikisi de önbellekten gelir; oturum SSR'da gelen çerezle yüklenir.
  beforeLoad: async ({ context, location }) => {
    const [config, me, features] = await Promise.all([
      context.queryClient.ensureQueryData(configQuery),
      context.queryClient.ensureQueryData(meQuery),
      context.queryClient.ensureQueryData(featuresQuery),
    ]);
    // Kilitli bölüm: /home ne zaman açılacağını gösterir.
    const needed = featureOfPath(location.pathname);
    if (needed && !features[needed]) throw redirect({ to: '/home' });
    return { config, me, features };
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#FBFAF7' },
      { name: 'color-scheme', content: 'light' },
      { name: 'application-name', content: SITE_NAME },
      { title: SITE_NAME },
      { name: 'description', content: t.home.description },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootComponent() {
  return (
    <OverlayProvider>
      <Layout>
        <Outlet />
      </Layout>
    </OverlayProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
