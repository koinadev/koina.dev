import type { Project } from '@koina/shared/api';
import { findProjectBySlug, listProjectTeam } from '@koina/db/repositories/projects';
import type { AppContext } from '../../../core/types/env';
import { fail } from '../../../core/utils/errors';
import { toMemberRef } from '../../members/utils/mappers';
import { toProject } from '../utils/mappers';

export async function getProject(c: AppContext): Promise<Response> {
  const viewer = c.get('viewer');
  const db = c.get('db');
  const row = await findProjectBySlug(db, c.req.param('slug')!, viewer?.id ?? null);
  if (!row) fail('NOT_FOUND');
  const team = await listProjectTeam(db, row.id);
  const project: Project = { ...toProject(row, !!viewer), team: team.map(toMemberRef) };
  return c.json(project);
}
