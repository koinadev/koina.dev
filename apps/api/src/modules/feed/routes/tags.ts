import { Hono } from 'hono';
import type { AppEnv } from '../../../core/types/env';
import { listTrending } from '../service/list-trending';

export const tagRoutes = new Hono<AppEnv>().get('/trending', (c) => listTrending(c));
