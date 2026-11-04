import type { MemberProfile } from '@koina/shared/api';
import { findMemberByHandle, getMemberStats } from '@koina/db/repositories/members';
import { countMemberRsvps } from '@koina/db/repositories/events';
import { listProjects } from '@koina/db/repositories/projects';
import type { AppContext } from '../../../core/types/env';
import { fail } from '../../../core/utils/errors';
import { toProject } from '../../projects/utils/mappers';
import { toMember } from '../utils/mappers';

/**
 * Profil: üye, sayılar ve en çok altı proje. Üye listesi bilerek yok: kimin üye olduğu herkese açık bir dizin değil; profil bir
 * gönderiden ya da projeden kullanıcı adıyla açılır. Uzaklaştırılmış üyenin profili görünmez.
 */
export async function getProfile(c: AppContext): Promise<Response> {
  const db = c.get('db');
  const row = await findMemberByHandle(db, c.req.param('handle')!);
  if (!row || row.bannedAt) fail('NOT_FOUND');
  const viewer = c.get('viewer');
  const [stats, events, projects] = await Promise.all([
    getMemberStats(db, row.id, viewer?.id ?? null),
    countMemberRsvps(db, row.id),
    listProjects(db, viewer?.id ?? null, { before: new Date(Date.now() + 60_000), member: row.handle, limit: 6 }),
  ]);
  const profile: MemberProfile = {
    ...toMember(row),
    stats: { posts: stats.posts, projects: stats.projects, claps: stats.claps, events, followers: stats.followers, following: stats.following },
    ...(viewer ? { followed: stats.followed } : {}),
    projects: projects.map((p) => toProject(p, !!viewer)),
  };
  return c.json(profile);
}
