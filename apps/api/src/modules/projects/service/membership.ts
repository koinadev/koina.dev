import { addProjectMember, findProjectIdBySlug, removeProjectMember } from '@koina/db/repositories/projects';
import { requireMember } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { fail } from '../../../core/utils/errors';

/** Ekibe katıl / ayrıl. Sahip ayrılamaz; proje sahipsiz kalırdı. */
export async function setMembership(c: AppContext, join: boolean): Promise<Response> {
  const member = requireMember(c);
  const db = c.get('db');
  const project = await findProjectIdBySlug(db, c.req.param('slug')!);
  if (!project) fail('NOT_FOUND');
  if (join) await addProjectMember(db, project.id, member.id);
  else {
    if (project.ownerId === member.id) fail('FORBIDDEN');
    await removeProjectMember(db, project.id, member.id);
  }
  return c.body(null, 204);
}
