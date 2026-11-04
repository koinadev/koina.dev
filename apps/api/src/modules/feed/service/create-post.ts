import type { createPost as createPostSchema } from '@koina/shared/api';
import type { z } from 'zod';
import { raiseTrust } from '@koina/db/repositories/members';
import {
  addPostMention,
  addPostTag,
  attachMedia,
  findPostMeta,
  hasDuplicatePost,
  insertPost,
  type PostMetaRow,
} from '@koina/db/repositories/posts';
import { findProjectBySlug } from '@koina/db/repositories/projects';
import { requireMember } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { newId } from '../../../core/utils/crypto';
import { fail } from '../../../core/utils/errors';
import { rateLimit } from '../../../core/utils/rate-limit';
import { aiScreenPost } from '../../moderation/service/ai-screen';
import { assertCleanText } from '../../moderation/service/screen-content';
import { DUPLICATE_WINDOW_MS, maxLinks, postsPerHour, TRUST_AFTER_DAYS } from '../../moderation/domain/spam-rules';
import { notify } from '../../notifications/service/notify';
import { getPreview, previewHash } from '../../previews/service/get-preview';
import { isPublicHttpUrl } from '../../previews/domain/safe-url';
import { extractMentions, extractTags, extractUrls } from '../domain/post-text';
import { loadPosts } from '../utils/load-posts';

type Input = z.output<typeof createPostSchema>;

/** Görünür ve kaldırılmamış gönderi; yoksa 404. */
async function visiblePost(c: AppContext, id: string): Promise<PostMetaRow> {
  const meta = await findPostMeta(c.get('db'), id);
  if (!meta || meta.status !== 'visible') fail('NOT_FOUND');
  return meta;
}

/**
 * Gönderi, yanıt ya da alıntı oluşturur. Sıra: içerik süzgeci → hız sınırı (güven düzeyine göre) → tekrar ve bağlantı sınırı →
 * bağlam (yanıtlanan, alıntılanan, proje) → tek transaction'da gönderi, görseller, etiketler, anmalar → bağlantı kartı →
 * bildirimler ve isteğe bağlı yapay zekâ denetimi yanıttan sonra.
 */
export async function createPost(c: AppContext, input: Input): Promise<Response> {
  const member = requireMember(c);
  const db = c.get('db');
  const body = input.body;
  assertCleanText(body);
  await rateLimit(c, 'post', postsPerHour(member.trust), 3600, member.id);
  if (body && (await hasDuplicatePost(db, member.id, body, new Date(Date.now() - DUPLICATE_WINDOW_MS)))) fail('DUPLICATE');
  const urls = extractUrls(body);
  if (urls.length > maxLinks(member.trust)) fail('TOO_MANY_LINKS');

  const parent = input.parentId ? await visiblePost(c, input.parentId) : null;
  const quoted = input.quoteId ? await visiblePost(c, input.quoteId) : null;
  let projectId = parent?.projectId ?? null;
  if (!parent && input.projectSlug) {
    // Projeye yalnız ekibi adına paylaşılır.
    const project = await findProjectBySlug(db, input.projectSlug, member.id);
    if (!project) fail('NOT_FOUND');
    if (!project.me) fail('FORBIDDEN');
    projectId = project.id;
  }

  const linkUrl = urls.find(isPublicHttpUrl) ?? null;
  const id = newId();
  const mentioned = await db.transaction(async (tx) => {
    await insertPost(tx, {
      id,
      userId: member.id,
      projectId,
      parentId: parent?.id ?? null,
      rootId: parent ? (parent.rootId ?? parent.id) : null,
      quoteId: quoted?.id ?? null,
      body,
      linkUrl,
      linkHash: linkUrl ? await previewHash(linkUrl) : null,
    });
    for (const [position, mediaId] of input.media.entries()) {
      if (!(await attachMedia(tx, id, mediaId, member.id, position))) fail('MEDIA_INVALID');
    }
    for (const tag of extractTags(body)) await addPostTag(tx, id, tag);
    const users: string[] = [];
    for (const handle of extractMentions(body)) {
      const row = await addPostMention(tx, id, handle);
      if (row) users.push(row.userId);
    }
    return users;
  });

  // Kart yanıttan önce hazırlanır ki gönderi ilk görünüşünde kartıyla gelsin; okunamazsa kartsız kalır.
  if (linkUrl) await getPreview(c, linkUrl).catch(() => null);

  const defer = c.get('defer');
  if (parent) defer(notify(c, { userId: parent.userId, actorId: member.id, kind: 'reply', postId: id }));
  if (quoted) defer(notify(c, { userId: quoted.userId, actorId: member.id, kind: 'quote', postId: id }));
  for (const userId of mentioned) defer(notify(c, { userId, actorId: member.id, kind: 'mention', postId: id }));
  defer(aiScreenPost(c, id, body));
  if (member.trust === 0) defer(raiseTrust(db, member.id, new Date(Date.now() - TRUST_AFTER_DAYS * 86_400_000)));

  const [post] = await loadPosts(c, [id]);
  return c.json(post, 201);
}
