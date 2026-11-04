import { analyticsHit, formNames, formSubmission, newsletterSubscribe, type FormName } from '@koina/shared/api';
import { Hono } from 'hono';
import type { AppEnv } from '../../../core/types/env';
import { fail } from '../../../core/utils/errors';
import { jsonBody } from '../../../core/utils/validate';
import { confirm, leave, subscribe } from '../service/newsletter';
import { recordHit } from '../service/record-hit';
import { submitForm } from '../service/submit-form';

const SITE_ID = 'koina';

// Sitenin "custom" form sağlayıcısının sözleşmesi: POST /v1/forms/<siteId>/<form> (bkz. apps/web contact.service.ts).
export const formRoutes = new Hono<AppEnv>().post(
  '/:site/:form',
  async (c, next) => {
    const { site, form } = c.req.param();
    if (site !== SITE_ID || !formNames.includes(form as FormName)) fail('NOT_FOUND');
    await next();
  },
  jsonBody(formSubmission),
  (c) => submitForm(c, c.req.param('form') as FormName, c.req.valid('json')),
);

export const newsletterRoutes = new Hono<AppEnv>()
  .post('/subscribe', jsonBody(newsletterSubscribe), (c) => subscribe(c, c.req.valid('json')))
  .get('/confirm', (c) => confirm(c))
  .get('/unsubscribe', (c) => leave(c));

export const analyticsRoutes = new Hono<AppEnv>().post('/hit', jsonBody(analyticsHit), (c) => recordHit(c, c.req.valid('json')));
