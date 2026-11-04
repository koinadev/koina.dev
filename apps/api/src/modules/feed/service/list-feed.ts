import { feedTabs, normalizeTag, type FeedTab, type Page, type Post } from '@koina/shared/api';
import { listFeedCandidates, listFollowingPostIds, listLatestPostIds } from '@koina/db/repositories/posts';
import { requireMember } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { decodeRankCursor, encodeRankCursor, timeCursor } from '../../../core/utils/cursor';
import { searchTerm } from '../../../core/utils/fold';
import { rankPosts } from '../domain/ranking';
import { loadPosts } from '../utils/load-posts';

const PAGE = 20;
const CANDIDATE_DAYS = 7;
const CANDIDATES = 400;

export interface FeedParams {
  tab?: string;
  tag?: string;
  project?: string;
  author?: string;
  q?: string;
  scope?: string;
  cursor?: string;
}

/** Süzgeçli liste her zaman zaman sırasıdır; süzgeçsiz istekte sekme belirler (varsayılan öne çıkanlar). */
export async function listFeed(c: AppContext, params: FeedParams): Promise<Response> {
  const filtered = !!(params.tag || params.project || params.author || params.q || params.scope === 'projects');
  const tab: FeedTab = feedTabs.includes(params.tab as FeedTab) ? (params.tab as FeedTab) : 'top';
  const page = filtered || tab === 'latest' ? await latest(c, params) : tab === 'following' ? await following(c, params.cursor) : await top(c, params.cursor);
  return c.json(page);
}

async function latest(c: AppContext, p: FeedParams): Promise<Page<Post>> {
  const rows = await listLatestPostIds(c.get('db'), {
    before: timeCursor(p.cursor),
    tag: p.tag ? normalizeTag(p.tag.replace(/^#/, '').slice(0, 40)) : null,
    project: p.project?.slice(0, 80) || null,
    author: p.author?.slice(0, 30) || null,
    onlyProjects: p.scope === 'projects',
    search: searchTerm(p.q),
    limit: PAGE + 1,
  });
  const items = await loadPosts(c, rows.slice(0, PAGE).map((r) => r.id));
  return { items, next: rows.length > PAGE ? rows[PAGE - 1]!.createdAt.toISOString() : null };
}

/** Takip: takip edilenlerin gönderileri ve yeniden paylaşımları; aynı gönderi iki kez gelirse ilk (en yeni) görünüm kalır. */
async function following(c: AppContext, cursor: string | undefined): Promise<Page<Post>> {
  const viewer = requireMember(c);
  const rows = await listFollowingPostIds(c.get('db'), viewer.id, timeCursor(cursor), PAGE + 1);
  const pageRows = rows.slice(0, PAGE);
  const posts = new Map((await loadPosts(c, pageRows.map((r) => r.id))).map((p) => [p.id, p]));
  const seen = new Set<string>();
  const items = pageRows.flatMap((r) => {
    const post = posts.get(r.id);
    if (!post || seen.has(r.id)) return [];
    seen.add(r.id);
    return [r.repostHandle ? { ...post, repostedBy: { handle: r.repostHandle, name: r.repostName ?? r.repostHandle } } : post];
  });
  return { items, next: rows.length > PAGE ? rows[PAGE - 1]!.sortAt.toISOString() : null };
}

/** Öne çıkanlar: son günlerin adayları puanlanır; imleç sıralamanın anını taşır ki sayfalar aynı sıralamadan kesilsin. */
async function top(c: AppContext, cursor: string | undefined): Promise<Page<Post>> {
  const { asOf, offset } = decodeRankCursor(cursor);
  const since = new Date(asOf.getTime() - CANDIDATE_DAYS * 86_400_000);
  const candidates = await listFeedCandidates(c.get('db'), c.get('viewer')?.id ?? null, since, asOf, CANDIDATES);
  const ranked = rankPosts(candidates, asOf);
  const items = await loadPosts(c, ranked.slice(offset, offset + PAGE));
  const nextOffset = offset + PAGE;
  return { items, next: nextOffset < ranked.length ? encodeRankCursor({ asOf, offset: nextOffset }) : null };
}
