import { deletePost as deletePostRow, findPostMeta, listPostMediaKeys } from '@koina/db/repositories/posts';
import { insertModerationLog } from '@koina/db/repositories/moderation';
import { isModerator, requireMember } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { newId } from '../../../core/utils/crypto';
import { fail } from '../../../core/utils/errors';
import { uuidParam } from '../../../core/utils/validate';

/** Gönderiyi yazarı ya da moderatör siler; yanıtları da gider (yabancı anahtar). Görseller depodan yanıttan sonra kalkar. */
export async function deletePost(c: AppContext): Promise<Response> {
  const member = requireMember(c);
  const id = uuidParam(c.req.param('id')!);
  const db = c.get('db');
  const meta = await findPostMeta(db, id);
  if (!meta) fail('NOT_FOUND');
  const own = meta.userId === member.id;
  if (!own && !isModerator(member)) fail('FORBIDDEN');
  const keys = (await listPostMediaKeys(db, id)).map((r) => r.key);
  await deletePostRow(db, id);
  if (!own) await insertModerationLog(db, { id: newId(), actorId: member.id, targetKind: 'post', targetId: id, action: 'delete', reason: '' });
  if (keys.length) c.get('defer')(c.env.MEDIA.delete(keys));
  return c.body(null, 204);
}
