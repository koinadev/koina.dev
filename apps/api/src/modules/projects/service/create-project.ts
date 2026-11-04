import type { createProject as createProjectSchema } from '@koina/shared/api';
import type { z } from 'zod';
import { addProjectMember, findProjectBySlug, insertProject, isProjectSlugTaken } from '@koina/db/repositories/projects';
import { handleFromEmail } from '../../../core/auth/handle';
import { requireMember } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { newId } from '../../../core/utils/crypto';
import { fail } from '../../../core/utils/errors';
import { rateLimit } from '../../../core/utils/rate-limit';
import { assertCleanText } from '../../moderation/service/screen-content';
import { toProject } from '../utils/mappers';

/** Proje açar; açan ekibin ilk üyesidir. Kısa ad kullanıcı adıyla aynı kurallarla üretilir, çakışırsa üç haneli sonek alır. */
export async function createProject(c: AppContext, input: z.output<typeof createProjectSchema>): Promise<Response> {
  const member = requireMember(c);
  assertCleanText(input.name, input.summary);
  await rateLimit(c, 'project-create', member.trust === 0 ? 2 : 5, 86_400, member.id);
  const db = c.get('db');
  const base = handleFromEmail(`${input.name}@x`).slice(0, 40);
  let slug = base;
  for (let i = 0; await isProjectSlugTaken(db, slug); i += 1) {
    if (i > 10) fail('CONFLICT');
    slug = `${base}-${Math.floor(Math.random() * 900 + 100)}`;
  }
  const id = newId();
  await db.transaction(async (tx) => {
    await insertProject(tx, { id, slug, name: input.name, summary: input.summary, repoUrl: input.repoUrl ?? null, lookingFor: input.lookingFor, ownerId: member.id });
    await addProjectMember(tx, id, member.id);
  });
  const row = await findProjectBySlug(db, slug, member.id);
  return c.json(toProject(row!, true), 201);
}
