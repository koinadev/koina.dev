import type { Post } from '@koina/shared/api';
import { findPostsByIds } from '@koina/db/repositories/posts';
import type { AppContext } from '../../../core/types/env';
import { toPost } from './mappers';

/** Kimlikleri verilen sırayla tam gönderiye çevirir; bulunmayan (bu arada silinen) atlanır. */
export async function loadPosts(c: AppContext, ids: readonly string[]): Promise<Post[]> {
  if (ids.length === 0) return [];
  const viewer = c.get('viewer');
  const rows = await findPostsByIds(c.get('db'), [...new Set(ids)], viewer?.id ?? null);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [toPost(c.env, row, !!viewer)] : [];
  });
}
