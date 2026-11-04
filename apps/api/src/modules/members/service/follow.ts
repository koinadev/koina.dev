import { findMemberByHandle, followMember, unfollowMember } from '@koina/db/repositories/members';
import { requireMember } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { fail } from '../../../core/utils/errors';
import { rateLimit } from '../../../core/utils/rate-limit';
import { notify } from '../../notifications/service/notify';

/** Takip et / bırak. Kendini takip edemezsin; yeni takip, takip edilene bildirilir. */
export async function follow(c: AppContext, on: boolean): Promise<Response> {
  const member = requireMember(c);
  const db = c.get('db');
  const target = await findMemberByHandle(db, c.req.param('handle')!);
  if (!target || target.bannedAt) fail('NOT_FOUND');
  if (target.id === member.id) fail('INVALID_INPUT');
  await rateLimit(c, 'follow', 100, 3600, member.id);
  if (!on) {
    await unfollowMember(db, member.id, target.id);
    return c.body(null, 204);
  }
  if (await followMember(db, member.id, target.id)) {
    c.get('defer')(notify(c, { userId: target.id, actorId: member.id, kind: 'follow' }));
  }
  return c.body(null, 204);
}
