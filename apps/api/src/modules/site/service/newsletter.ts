import type { newsletterSubscribe } from '@koina/shared/api';
import type { z } from 'zod';
import { confirmSubscriber, unsubscribe, upsertSubscriber } from '@koina/db/repositories/site';
import type { AppContext } from '../../../core/types/env';
import { randomToken } from '../../../core/utils/crypto';
import { fail } from '../../../core/utils/errors';
import { sendMail } from '../../../core/utils/mail';
import { rateLimit } from '../../../core/utils/rate-limit';
import { resultPage } from './result-page';

const copy = {
  tr: {
    subject: 'Koina bültenine aboneliğini onayla',
    text: (link: string) =>
      `Merhaba!\n\nKoina bültenine katılmak için bu bağlantıya tıkla:\n${link}\n\nSen istemediysen bu e-postayı yok sayabilirsin.\n\nKoina`,
  },
  en: {
    subject: 'Confirm your Koina newsletter subscription',
    text: (link: string) =>
      `Hi!\n\nClick this link to join the Koina newsletter:\n${link}\n\nIf you didn't ask for this, you can ignore this email.\n\nKoina`,
  },
};

/**
 * Çift onaylı abonelik: kayıt önce onaysız düşer, e-postadaki bağlantı onaylar. Yanıt her durumda aynıdır ki bir adresin listede
 * olup olmadığı dışarıdan anlaşılmasın.
 */
export async function subscribe(c: AppContext, input: z.output<typeof newsletterSubscribe>): Promise<Response> {
  if (input.website) fail('INVALID_SUBMISSION');
  await rateLimit(c, 'newsletter', 5, 3600);
  await rateLimit(c, 'newsletter-email', 3, 86_400, input.email);
  const row = await upsertSubscriber(c.get('db'), input.email, input.locale, randomToken(24));
  if (!row.confirmedAt) {
    const link = new URL(`/v1/newsletter/confirm?token=${row.token}`, c.env.API_URL).href;
    const t = copy[input.locale];
    const sent = await sendMail(c.env, { to: input.email, subject: t.subject, text: t.text(link) });
    if (!sent && c.env.ENVIRONMENT !== 'development') fail('MAIL_UNAVAILABLE');
  }
  return c.json({ success: true });
}

export async function confirm(c: AppContext): Promise<Response> {
  const row = await confirmSubscriber(c.get('db'), c.req.query('token') ?? '');
  return resultPage(c.env, !!row, row?.locale ?? 'tr');
}

export async function leave(c: AppContext): Promise<Response> {
  const row = await unsubscribe(c.get('db'), c.req.query('token') ?? '');
  return resultPage(c.env, !!row, row?.locale ?? 'tr');
}
