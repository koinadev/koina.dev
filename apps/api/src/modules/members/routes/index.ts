import { reportInput } from '@koina/shared/api';
import { Hono } from 'hono';
import type { AppEnv } from '../../../core/types/env';
import { jsonBody } from '../../../core/utils/validate';
import { reportContent } from '../../moderation/service/report-content';
import { follow } from '../service/follow';
import { getProfile } from '../service/get-profile';

// `GET /v1/members` bilerek yok (üye listesi herkese açık değil).
export const memberRoutes = new Hono<AppEnv>()
  .get('/:handle', (c) => getProfile(c))
  .post('/:handle/follow', (c) => follow(c, true))
  .delete('/:handle/follow', (c) => follow(c, false))
  .post('/:handle/report', jsonBody(reportInput), (c) => reportContent(c, 'user', c.req.valid('json')));
