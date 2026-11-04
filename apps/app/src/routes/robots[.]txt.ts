import { createFileRoute } from '@tanstack/react-router';

/**
 * Tarayıcı kuralları. Profiller ve kişisel sayfalar burada engellenmez: `noindex` etiketlerini görebilmeleri için açık kalırlar.
 * Vekil (`/api/`) ve sunucu işlevleri taranmaz.
 */
export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async () => {
        const { serverConfig } = await import('@/lib/server/env.server');
        const { appUrl } = serverConfig();
        const body = ['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /_serverFn/', '', `Sitemap: ${appUrl}/sitemap.xml`, `Sitemap: ${appUrl}/sitemap-index.xml`, ''].join('\n');
        return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
      },
    },
  },
});
