import { createPost as createPostSchema, reportInput } from '@koina/shared/api';
import { Hono } from 'hono';
import type { AppEnv } from '../../../core/types/env';
import { jsonBody } from '../../../core/utils/validate';
import { reportContent } from '../../moderation/service/report-content';
import { createPost } from '../service/create-post';
import { deletePost } from '../service/delete-post';
import { getThread } from '../service/get-thread';
import { listFeed } from '../service/list-feed';
import { react, type Reaction } from '../service/react';

const reactions: Reaction[] = ['clap', 'repost', 'bookmark'];

const routes = new Hono<AppEnv>()
  .get('/', (c) => listFeed(c, c.req.query()))
  .get('/:id', (c) => getThread(c))
  .post('/', jsonBody(createPostSchema), (c) => createPost(c, c.req.valid('json')))
  .delete('/:id', (c) => deletePost(c))
  .post('/:id/report', jsonBody(reportInput), (c) => reportContent(c, 'post', c.req.valid('json')));

for (const reaction of reactions) {
  routes.post(`/:id/${reaction}`, (c) => react(c, reaction, true));
  routes.delete(`/:id/${reaction}`, (c) => react(c, reaction, false));
}

export const feedRoutes = routes;
