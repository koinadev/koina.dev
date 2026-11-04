import type { Thread } from '@koina/shared/api';
import { findPostMeta, listAncestorIds, listReplyIds } from '@koina/db/repositories/posts';
import { isModerator } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { fail } from '../../../core/utils/errors';
import { uuidParam } from '../../../core/utils/validate';
import { loadPosts } from '../utils/load-posts';

/** Gönderi sayfası: üst zincir (kökten yakına), gönderi ve doğrudan yanıtlar. Görünmeyen gönderiyi yalnız yazarı ve moderatör açar. */
export async function getThread(c: AppContext): Promise<Response> {
  const id = uuidParam(c.req.param('id')!);
  const viewer = c.get('viewer');
  const db = c.get('db');
  const meta = await findPostMeta(db, id);
  const canSee = meta && (meta.status === 'visible' || (viewer && (viewer.id === meta.userId || isModerator(viewer))));
  if (!meta || !canSee || meta.status === 'removed') fail('NOT_FOUND');
  const [ancestors, replies] = await Promise.all([listAncestorIds(db, id), listReplyIds(db, id, viewer?.id ?? null)]);
  const [ancestorPosts, [post], replyPosts] = await Promise.all([
    loadPosts(c, ancestors.map((a) => a.id)),
    loadPosts(c, [id]),
    loadPosts(c, replies.map((r) => r.id)),
  ]);
  const thread: Thread = { ancestors: ancestorPosts.filter((p) => !p.hidden), post: post!, replies: replyPosts };
  return c.json(thread);
}
