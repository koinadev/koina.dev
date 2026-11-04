import { createLink as createLinkSchema, linkPreviewInput, reportInput } from '@koina/shared/api';
import { Hono } from 'hono';
import type { AppEnv } from '../../../core/types/env';
import { jsonBody } from '../../../core/utils/validate';
import { reportContent } from '../../moderation/service/report-content';
import { createLink } from '../service/create-link';
import { deleteLink } from '../service/delete-link';
import { getLink } from '../service/get-link';
import { listLinks, listTags } from '../service/list-links';
import { previewLink } from '../service/preview-link';
import { voteLink } from '../service/vote-link';

export const linkRoutes = new Hono<AppEnv>()
  .get('/', (c) => listLinks(c, c.req.query()))
  .get('/tags', (c) => listTags(c))
  .post('/preview', jsonBody(linkPreviewInput), (c) => previewLink(c, c.req.valid('json')))
  .post('/', jsonBody(createLinkSchema), (c) => createLink(c, c.req.valid('json')))
  .get('/:id', (c) => getLink(c))
  .delete('/:id', (c) => deleteLink(c))
  .post('/:id/vote', (c) => voteLink(c, true))
  .delete('/:id/vote', (c) => voteLink(c, false))
  .post('/:id/report', jsonBody(reportInput), (c) => reportContent(c, 'link', c.req.valid('json')));
