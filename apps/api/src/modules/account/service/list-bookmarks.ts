import type { Page, Post } from '@koina/shared/api';
import { listBookmarkIds } from '@koina/db/repositories/posts';
import { requireMember } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { timeCursor } from '../../../core/utils/cursor';
import { loadPosts } from '../../feed/utils/load-posts';

const PAGE = 20;

/** Kaydedilenler: yalnız üyenin kendisi görür, kaydetme sırasıyla. */
export async function listBookmarks(c: AppContext): Promise<Response> {
  const member = requireMember(c);
  const rows = await listBookmarkIds(c.get('db'), member.id, timeCursor(c.req.query('cursor')), PAGE + 1);
  const page: Page<Post> = {
    items: await loadPosts(c, rows.slice(0, PAGE).map((r) => r.id)),
    next: rows.length > PAGE ? rows[PAGE - 1]!.createdAt.toISOString() : null,
  };
  return c.json(page);
}
