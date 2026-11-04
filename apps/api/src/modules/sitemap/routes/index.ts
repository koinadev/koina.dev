import { Hono } from 'hono';
import type { AppEnv } from '../../../core/types/env';
import { getSitemap } from '../service/get-sitemap';

export const sitemapRoutes = new Hono<AppEnv>().get('/', (c) => getSitemap(c));
