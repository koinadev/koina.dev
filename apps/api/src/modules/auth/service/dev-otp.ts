import { findLatestDevMail } from '@koina/db/repositories/site';
import type { AppContext } from '../../../core/types/env';
import { fail } from '../../../core/utils/errors';

/** Yalnız geliştirme: e-posta servisi yokken son gönderilen giriş kodu. Üretimde uç yoktur (404). */
export async function devOtp(c: AppContext): Promise<Response> {
  if (c.env.ENVIRONMENT !== 'development' || c.env.RESEND_API_KEY) fail('NOT_FOUND');
  const email = (c.req.query('email') ?? '').trim().toLowerCase();
  const mail = email ? await findLatestDevMail(c.get('db'), email) : null;
  if (!mail || Date.now() - mail.createdAt.getTime() > 10 * 60_000) fail('NOT_FOUND');
  return c.json({ code: mail.body });
}
