import type { Trend } from '@koina/shared/api';
import { listTrendingTags } from '@koina/db/repositories/posts';
import type { AppContext } from '../../../core/types/env';

const DAYS = 7;

/** Gündemdeki etiketler: herkese aynı, beş dakika önbellekte. */
export async function listTrending(c: AppContext): Promise<Response> {
  const limit = Math.min(Number(c.req.query('limit') ?? 10) || 10, 30);
  const rows = await listTrendingTags(c.get('db'), new Date(Date.now() - DAYS * 86_400_000), limit);
  const trends: Trend[] = rows.map((r) => ({ tag: r.tag, people: r.people, posts: r.posts }));
  c.header('cache-control', 'public, max-age=300');
  return c.json({ items: trends, next: null });
}
