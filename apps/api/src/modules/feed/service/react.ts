import {
  bookmarkPost,
  clapPost,
  findPostMeta,
  repostPost,
  unbookmarkPost,
  unclapPost,
  unrepostPost,
} from '@koina/db/repositories/posts';
import { requireMember } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { fail } from '../../../core/utils/errors';
import { rateLimit } from '../../../core/utils/rate-limit';
import { uuidParam } from '../../../core/utils/validate';
import { notify } from '../../notifications/service/notify';

export type Reaction = 'clap' | 'repost' | 'bookmark';

const actions = {
  clap: { add: clapPost, remove: unclapPost },
  repost: { add: repostPost, remove: unrepostPost },
  bookmark: { add: bookmarkPost, remove: unbookmarkPost },
} as const;

/**
 * Alkış, yeniden paylaşım ve kaydetme: `POST` ekler, `DELETE` kaldırır; ikisi de tekrar güvenlidir. Kaydetme özeldir, bildirim
 * üretmez; alkış ve yeniden paylaşım yazara bildirilir (yalnız ilk kez).
 */
export async function react(c: AppContext, reaction: Reaction, on: boolean): Promise<Response> {
  const member = requireMember(c);
  const id = uuidParam(c.req.param('id')!);
  const db = c.get('db');
  await rateLimit(c, 'react', 300, 3600, member.id);
  if (!on) {
    await actions[reaction].remove(db, id, member.id);
    return c.body(null, 204);
  }
  const meta = await findPostMeta(db, id);
  if (!meta || meta.status !== 'visible') fail('NOT_FOUND');
  const added = await actions[reaction].add(db, id, member.id);
  if (added && reaction !== 'bookmark') c.get('defer')(notify(c, { userId: meta.userId, actorId: member.id, kind: reaction, postId: id }));
  return c.body(null, 204);
}
