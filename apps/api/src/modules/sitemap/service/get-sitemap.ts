import type { SitemapData } from '@koina/shared/api';
import { listSitemapLinks, listSitemapPosts, listSitemapProjects, listSitemapTags } from '@koina/db/repositories/site';
import type { AppContext } from '../../../core/types/env';

/** Site haritası verisi: herkese açık ve dizine girmesi istenen içerik. Profiller bilerek yok (üye dizini olmasın). Bir saat önbellekte. */
export async function getSitemap(c: AppContext): Promise<Response> {
  const db = c.get('db');
  const [posts, projects, links, tags] = await Promise.all([
    listSitemapPosts(db, 5000),
    listSitemapProjects(db, 2000),
    listSitemapLinks(db, 5000),
    listSitemapTags(db, 500),
  ]);
  const data: SitemapData = {
    posts: posts.map((p) => ({ id: p.id, updatedAt: p.createdAt.toISOString() })),
    projects: projects.map((p) => ({ slug: p.slug, updatedAt: p.createdAt.toISOString() })),
    links: links.map((l) => ({ id: l.id, updatedAt: l.createdAt.toISOString() })),
    tags: tags.map((t) => ({ tag: t.tag, updatedAt: t.createdAt.toISOString() })),
  };
  c.header('cache-control', 'public, max-age=3600');
  return c.json(data);
}
