import { findLinkMeta, unvoteLink, voteLink as voteLinkRow } from '@koina/db/repositories/links';
import { requireMember } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { fail } from '../../../core/utils/errors';
import { rateLimit } from '../../../core/utils/rate-limit';
import { uuidParam } from '../../../core/utils/validate';

/** "İşe yarar" oyu: `POST` ekler, `DELETE` kaldırır. Kendi bağlantısına oy sayılmaz (sıralama sorgusu yazarın oyunu dışlar). */
export async function voteLink(c: AppContext, on: boolean): Promise<Response> {
  const member = requireMember(c);
  const id = uuidParam(c.req.param('id')!);
  const db = c.get('db');
  await rateLimit(c, 'vote', 200, 3600, member.id);
  if (!on) {
    await unvoteLink(db, id, member.id);
    return c.body(null, 204);
  }
  const meta = await findLinkMeta(db, id);
  if (!meta || meta.status !== 'visible') fail('NOT_FOUND');
  await voteLinkRow(db, id, member.id);
  return c.body(null, 204);
}
