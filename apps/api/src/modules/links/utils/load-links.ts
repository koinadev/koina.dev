import type { Link } from '@koina/shared/api';
import { findLinksByIds } from '@koina/db/repositories/links';
import type { AppContext } from '../../../core/types/env';
import { toLink } from './mappers';

/** Kimlikleri verilen sırayla tam bağlantıya çevirir. */
export async function loadLinks(c: AppContext, ids: readonly string[]): Promise<Link[]> {
  if (ids.length === 0) return [];
  const viewer = c.get('viewer');
  const rows = await findLinksByIds(c.get('db'), [...new Set(ids)], viewer?.id ?? null);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [toLink(row, !!viewer)] : [];
  });
}
