import { createProject as createProjectSchema } from '@koina/shared/api';
import { Hono } from 'hono';
import type { AppEnv } from '../../../core/types/env';
import { jsonBody } from '../../../core/utils/validate';
import { createProject } from '../service/create-project';
import { getProject } from '../service/get-project';
import { listProjects } from '../service/list-projects';
import { setMembership } from '../service/membership';

export const projectRoutes = new Hono<AppEnv>()
  .get('/', (c) => listProjects(c))
  .post('/', jsonBody(createProjectSchema), (c) => createProject(c, c.req.valid('json')))
  .get('/:slug', (c) => getProject(c))
  .post('/:slug/join', (c) => setMembership(c, true))
  .delete('/:slug/join', (c) => setMembership(c, false));
