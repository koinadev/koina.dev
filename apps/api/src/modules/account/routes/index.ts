import { updateProfile } from '@koina/shared/api';
import { Hono } from 'hono';
import type { AppEnv } from '../../../core/types/env';
import { jsonBody } from '../../../core/utils/validate';
import { listNotifications, readNotifications } from '../../notifications/service/list-notifications';
import { deleteMe } from '../service/delete-me';
import { getMe } from '../service/get-me';
import { listBookmarks } from '../service/list-bookmarks';
import { updateMe } from '../service/update-me';

export const accountRoutes = new Hono<AppEnv>()
  .get('/', (c) => getMe(c))
  .patch('/', jsonBody(updateProfile), (c) => updateMe(c, c.req.valid('json')))
  .delete('/', (c) => deleteMe(c))
  .get('/bookmarks', (c) => listBookmarks(c))
  .get('/notifications', (c) => listNotifications(c))
  .post('/notifications/read', (c) => readNotifications(c));
