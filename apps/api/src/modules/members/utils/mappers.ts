import type { Me, Member, MemberRef, Role } from '@koina/shared/api';
import type { MemberRow } from '@koina/db/repositories/members';

// Satır → sözleşme. Yanıta giren her alan açıkça yazılır: satıra eklenen yeni sütun (e-posta, yetki, güven) kendiliğinden dışarı çıkmaz.

export const toMember = (row: MemberRow): Member => ({
  id: row.id,
  handle: row.handle ?? '',
  name: row.name,
  bio: row.bio,
  roles: row.roles as Role[],
  interests: row.interests,
  github: row.github,
  website: row.website,
  location: row.location,
  createdAt: row.createdAt.toISOString(),
});

export const toMe = (row: MemberRow, unread: number): Me => ({
  ...toMember(row),
  email: row.email,
  role: row.role,
  unread,
});

export const toMemberRef = (row: { handle: string; name: string; roles: string[] }): MemberRef => ({
  handle: row.handle,
  name: row.name,
  roles: row.roles as Role[],
});
