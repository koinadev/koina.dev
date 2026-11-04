import type { SitemapData } from '@koina/shared/api';
import { createFileRoute } from '@tanstack/react-router';

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Site haritası: gönderiler, projeler, bağlantılar, etiketler. Profiller bilerek yok (üye listesi herkese açık değil). */
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const { serverConfig, upstream } = await import('@/lib/server/env.server');
        const { appUrl } = serverConfig();
        let data: SitemapData = { posts: [], projects: [], links: [], tags: [] };
        try {
          const res = await upstream('/v1/sitemap', { headers: { accept: 'application/json' } });
          if (res.ok) data = (await res.json()) as SitemapData;
        } catch {
          /* API düşükse yalnız sabit sayfalar listelenir */
        }
        const entry = (path: string, lastmod?: string, priority?: string) =>
          `<url><loc>${xml(appUrl + path)}</loc>${lastmod ? `<lastmod>${xml(lastmod)}</lastmod>` : ''}${priority ? `<priority>${priority}</priority>` : ''}</url>`;
        const urls = [
          entry('/', undefined, '1.0'),
          entry('/kesfet', undefined, '0.8'),
          entry('/baglantilar', undefined, '0.8'),
          entry('/takvim', undefined, '0.6'),
          entry('/yazilar', undefined, '0.6'),
          ...data.projects.map((p) => entry(`/proje/${encodeURIComponent(p.slug)}`, p.updatedAt, '0.7')),
          ...data.posts.map((p) => entry(`/akis/${p.id}`, p.updatedAt)),
          ...data.links.map((l) => entry(`/baglantilar/${l.id}`, l.updatedAt)),
          ...data.tags.map((tg) => entry(`/etiket/${encodeURIComponent(tg.tag)}`, tg.updatedAt, '0.4')),
        ];
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
        return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=900' } });
      },
    },
  },
});
