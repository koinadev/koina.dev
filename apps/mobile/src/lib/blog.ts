import type { BlogFeed } from '@koina/shared/api';
import { ApiError } from './api';
import { SITE_URL } from './config';
import { locale } from './i18n';

/** Beslemedeki göreli yolu (`/tr/blog/…`, `/_astro/…`) sitenin köküne bağlar. */
export const siteUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path}`);

export async function fetchBlog(): Promise<BlogFeed> {
  let res: Response;
  try {
    res = await fetch(`${SITE_URL}/blog/${locale}.json`, { headers: { accept: 'application/json' } });
  } catch {
    throw new ApiError(0, 'NETWORK');
  }
  if (!res.ok) throw new ApiError(res.status, res.status === 404 ? 'NOT_FOUND' : 'INTERNAL');
  const feed = (await res.json()) as BlogFeed;
  return { ...feed, posts: feed.posts.map((p) => ({ ...p, url: siteUrl(p.url), cover: p.cover && siteUrl(p.cover) })) };
}
