import type { Post, PostMedia, QuotedPost } from '@koina/shared/api';
import type { MediaJson, PostRow, QuoteJson } from '@koina/db/repositories/posts';
import type { Env } from '../../../core/types/env';
import { mediaUrl } from '../../../core/utils/media-url';
import { toMemberRef } from '../../members/utils/mappers';

const toMedia = (env: Env, media: MediaJson[] | null): PostMedia[] =>
  (media ?? []).map((m) => ({ id: m.id, url: mediaUrl(env, m.key), width: m.width, height: m.height, alt: m.alt }));

const toQuote = (env: Env, q: QuoteJson): QuotedPost => {
  const author = toMemberRef(q);
  // Gizlenen ya da kaldırılan gönderi alıntıda da görünmez; yalnız "kullanılamıyor" yer tutucusu kalır.
  if (q.status !== 'visible') return { id: q.id, body: '', author, createdAt: q.createdAt, media: [], unavailable: true };
  return { id: q.id, body: q.body, author, createdAt: new Date(q.createdAt).toISOString(), media: toMedia(env, q.media) };
};

/** Satır → sözleşme. İzleyene özel alanlar yalnız girişliyse; `hidden` yalnız görünür olmayan gönderide (yazar/moderatör görür). */
export function toPost(env: Env, row: PostRow, signedIn: boolean): Post {
  return {
    id: row.id,
    body: row.body,
    author: toMemberRef({ handle: row.authorHandle, name: row.authorName, roles: row.authorRoles }),
    project: row.projectSlug ? { slug: row.projectSlug, name: row.projectName ?? row.projectSlug } : null,
    parentId: row.parentId,
    rootId: row.rootId,
    replyTo: row.parentHandle,
    media: toMedia(env, row.media),
    preview: row.preview,
    quote: row.quote ? toQuote(env, row.quote) : null,
    claps: row.claps,
    replies: row.replies,
    reposts: row.reposts,
    quotes: row.quotes,
    createdAt: row.createdAt.toISOString(),
    ...(signedIn ? { clapped: row.clapped, reposted: row.reposted, bookmarked: row.bookmarked } : {}),
    ...(row.status !== 'visible' ? { hidden: true } : {}),
  };
}
