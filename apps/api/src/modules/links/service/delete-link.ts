import { deleteLink as deleteLinkRow, findLinkMeta } from '@koina/db/repositories/links';
import { insertModerationLog } from '@koina/db/repositories/moderation';
import { isModerator, requireMember } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { newId } from '../../../core/utils/crypto';
import { fail } from '../../../core/utils/errors';
import { uuidParam } from '../../../core/utils/validate';

export async function deleteLink(c: AppContext): Promise<Response> {
  const member = requireMember(c);
  const id = uuidParam(c.req.param('id')!);
  const db = c.get('db');
  const meta = await findLinkMeta(db, id);
  if (!meta) fail('NOT_FOUND');
  const own = meta.userId === member.id;
  if (!own && !isModerator(member)) fail('FORBIDDEN');
  await deleteLinkRow(db, id);
  if (!own) await insertModerationLog(db, { id: newId(), actorId: member.id, targetKind: 'link', targetId: id, action: 'delete', reason: '' });
  return c.body(null, 204);
}
