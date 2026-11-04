import { countMembers } from '@koina/db/repositories/site';
import { Hono } from 'hono';
import type { AppEnv } from '../../../core/types/env';
import { safeEqual } from '../../../core/utils/crypto';
import { fail } from '../../../core/utils/errors';
import { jsonBody } from '../../../core/utils/validate';
import { addEvent, analyticsSummary, assignRole, newEvent, removeEvent, roleInput, submissions, subscribers } from '../service/admin';

// Yönetici uçları: `Authorization: Bearer <ADMIN_TOKEN>`. Sır tanımlı değilse hepsi kapalı.
export const adminRoutes = new Hono<AppEnv>()
  .use(async (c, next) => {
    const expected = c.env.ADMIN_TOKEN;
    const given = c.req.header('authorization')?.replace(/^Bearer\s+/, '') ?? '';
    if (!expected || !safeEqual(given, expected)) fail('UNAUTHORIZED');
    await next();
  })
  .get('/members', async (c) => c.json({ members: await countMembers(c.get('db')) }))
  .get('/analytics', (c) => analyticsSummary(c))
  .get('/submissions', (c) => submissions(c))
  .get('/subscribers', (c) => subscribers(c))
  .post('/events', jsonBody(newEvent), (c) => addEvent(c, c.req.valid('json')))
  .delete('/events/:id', (c) => removeEvent(c))
  .post('/members/:handle/role', jsonBody(roleInput), (c) => assignRole(c, c.req.valid('json')));
