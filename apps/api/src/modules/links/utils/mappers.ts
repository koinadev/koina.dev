import type { Link, LinkCategory } from '@koina/shared/api';
import type { LinkRow } from '@koina/db/repositories/links';
import { toMemberRef } from '../../members/utils/mappers';
import { hostOf } from '../../previews/domain/canonical-url';

export const toLink = (row: LinkRow, signedIn: boolean): Link => ({
  id: row.id,
  url: row.url,
  host: hostOf(row.url),
  title: row.title,
  description: row.description,
  image: row.image,
  siteName: row.siteName,
  category: row.category as LinkCategory,
  tags: row.tags,
  author: toMemberRef({ handle: row.authorHandle, name: row.authorName, roles: row.authorRoles }),
  votes: row.votes,
  createdAt: row.createdAt.toISOString(),
  ...(signedIn ? { voted: row.voted } : {}),
  ...(row.status !== 'visible' ? { hidden: true } : {}),
});
