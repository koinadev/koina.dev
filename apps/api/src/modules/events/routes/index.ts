import { Hono } from 'hono';
import type { AppEnv } from '../../../core/types/env';
import { listEvents } from '../service/list-events';
import { rsvp } from '../service/rsvp';

export const eventRoutes = new Hono<AppEnv>()
  .get('/', (c) => listEvents(c))
  .post('/:id/rsvp', (c) => rsvp(c, true))
  .delete('/:id/rsvp', (c) => rsvp(c, false));
