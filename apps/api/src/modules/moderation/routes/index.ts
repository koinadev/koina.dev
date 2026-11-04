import { modActionInput } from '@koina/shared/api';
import { Hono } from 'hono';
import type { AppEnv } from '../../../core/types/env';
import { jsonBody } from '../../../core/utils/validate';
import { applyAction } from '../service/apply-action';
import { listLog, listQueue } from '../service/list-queue';

/** Moderatör yüzeyi. Şikâyet uçları içeriğin kendi modülünde (`/feed/:id/report`, `/links/:id/report`, `/members/:handle/report`). */
export const moderationRoutes = new Hono<AppEnv>()
  .get('/queue', (c) => listQueue(c))
  .get('/log', (c) => listLog(c))
  .post('/actions', jsonBody(modActionInput), (c) => applyAction(c, c.req.valid('json')));
