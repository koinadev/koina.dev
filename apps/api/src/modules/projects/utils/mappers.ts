import type { Project, ProjectStatus, Role } from '@koina/shared/api';
import type { ProjectRow } from '@koina/db/repositories/projects';
import { toMemberRef } from '../../members/utils/mappers';

export const toProject = (row: ProjectRow, signedIn: boolean): Project => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  summary: row.summary,
  status: row.status as ProjectStatus,
  repoUrl: row.repoUrl,
  lookingFor: row.lookingFor as Role[],
  owner: toMemberRef({ handle: row.ownerHandle, name: row.ownerName, roles: row.ownerRoles }),
  members: row.members,
  posts: row.posts,
  createdAt: row.createdAt.toISOString(),
  ...(signedIn ? { me: row.me } : {}),
});
