import type { MemberRow } from '@koina/db/repositories/members';
import type { AppContext } from '../types/env';
import { fail } from '../utils/errors';

/** Giriş zorunlu uçlar: üye yoksa 401, uzaklaştırılmışsa 403 `BANNED`. */
export function requireMember(c: AppContext): MemberRow {
  const viewer = c.get('viewer');
  if (!viewer) fail('UNAUTHORIZED');
  if (viewer.bannedAt) fail('BANNED');
  return viewer;
}

export const isModerator = (member: MemberRow | null): boolean => member?.role === 'moderator' || member?.role === 'admin';

/** Moderasyon uçları: moderatör ya da yönetici. */
export function requireModerator(c: AppContext): MemberRow {
  const member = requireMember(c);
  if (!isModerator(member)) fail('FORBIDDEN');
  return member;
}
