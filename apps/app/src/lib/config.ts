import type { BlogFeed, BlogPost } from '@koina/shared/api';
import { createServerFn } from '@tanstack/react-start';
import { resolveUrl } from './format';

export interface AppConfig {
  /** Kanonik adreslerin kökü (`APP_URL`). */
  appUrl: string;
  /** Tanıtım sitesi: blog beslemesi, takvim aboneliği, davranış kuralları. */
  siteUrl: string;
  turnstileSiteKey: string;
  dev: boolean;
}

/** Ortam Worker'da okunur; kök yükleyici bunu bir kez çağırır, sonuç sayfayla birlikte tarayıcıya iner. */
export const getAppConfig = createServerFn({ method: 'GET' }).handler(async (): Promise<AppConfig> => {
  const { serverConfig } = await import('./server/env.server');
  const { appUrl, siteUrl, turnstileSiteKey, dev } = serverConfig();
  return { appUrl, siteUrl, turnstileSiteKey, dev };
});

export type BlogSummary = Omit<BlogPost, 'body'>;

/** Sitenin `/blog/tr.json` beslemesi; göreli yollar sitenin köküne bağlanır. Erişilemezse `null`. */
async function loadFeed(): Promise<BlogPost[] | null> {
  const { serverConfig } = await import('./server/env.server');
  const { siteUrl } = serverConfig();
  try {
    const res = await fetch(`${siteUrl}/blog/tr.json`, { headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const feed = (await res.json()) as BlogFeed;
    return [...feed.posts]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((p) => ({ ...p, url: resolveUrl(p.url, siteUrl), cover: p.cover ? resolveUrl(p.cover, siteUrl) : null }));
  } catch {
    return null;
  }
}

/** Yazı listesi: gövdeler olmadan (sayfaya gömülen veri küçük kalsın). */
export const getBlogList = createServerFn({ method: 'GET' }).handler(async (): Promise<BlogSummary[] | null> => {
  const posts = await loadFeed();
  return posts?.map(({ body: _body, ...rest }) => rest) ?? null;
});

/** Tek yazı ve markdown'dan üretilmiş HTML. Markdown bizim içeriğimiz (sitenin içerik klasörü); sunucuda bir kez çevrilir. */
export const getBlogPost = createServerFn({ method: 'GET' })
  .validator((slug: string) => String(slug).slice(0, 120))
  .handler(async ({ data: slug }) => {
    const posts = await loadFeed();
    if (!posts) return { status: 'unavailable' as const };
    const post = posts.find((p) => p.slug === slug);
    if (!post) return { status: 'missing' as const };
    const { serverConfig } = await import('./server/env.server');
    const { marked } = await import('marked');
    const { siteUrl } = serverConfig();
    const raw = marked.parse(post.body, { async: false, gfm: true });
    const html = raw.replace(/(src|href)="(\/[^"]*)"/g, (_m, attr: string, path: string) => `${attr}="${resolveUrl(path, siteUrl)}"`);
    const { body: _body, ...rest } = post;
    return { status: 'ok' as const, post: rest, html };
  });
