import { projectStatuses, roles, type Page, type Project, type ProjectStatus, type Role } from '@koina/shared/api';
import { listProjects as listRows } from '@koina/db/repositories/projects';
import type { AppContext } from '../../../core/types/env';
import { timeCursor } from '../../../core/utils/cursor';
import { searchTerm } from '../../../core/utils/fold';
import { toProject } from '../utils/mappers';

const PAGE = 20;

/** Keşfet: durum, aranan rol, arama ve ekip üyesine göre süzülen projeler; yeni olan önce. Bilinmeyen süzgeç değeri atlanır. */
export async function listProjects(c: AppContext): Promise<Response> {
  const q = c.req.query();
  const viewer = c.get('viewer');
  const rows = await listRows(c.get('db'), viewer?.id ?? null, {
    before: timeCursor(q.cursor),
    status: projectStatuses.includes(q.status as ProjectStatus) ? q.status : null,
    role: roles.includes(q.role as Role) ? q.role : null,
    search: searchTerm(q.q),
    member: q.member?.slice(0, 30) || null,
    limit: PAGE + 1,
  });
  const page: Page<Project> = {
    items: rows.slice(0, PAGE).map((r) => toProject(r, !!viewer)),
    next: rows.length > PAGE ? rows[PAGE - 1]!.createdAt.toISOString() : null,
  };
  return c.json(page);
}
