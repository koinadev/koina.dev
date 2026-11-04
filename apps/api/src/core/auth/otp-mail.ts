import { insertDevMail } from '@koina/db/repositories/site';
import type { Queryable } from '@koina/db';
import { APIError } from 'better-auth/api';
import type { Env } from '../types/env';
import { newId } from '../utils/crypto';
import { sendMail } from '../utils/mail';

export const OTP_MINUTES = 10;

const copy = {
  tr: {
    subject: (code: string) => `Koina giriş kodun: ${code}`,
    text: (code: string) =>
      `Koina'ya giriş kodun: ${code}\n\nKod ${OTP_MINUTES} dakika geçerli. Sen istemediysen bu e-postayı yok sayabilirsin.`,
  },
  en: {
    subject: (code: string) => `Your Koina sign-in code: ${code}`,
    text: (code: string) =>
      `Your Koina sign-in code: ${code}\n\nIt is valid for ${OTP_MINUTES} minutes. If you didn't ask for it, ignore this email.`,
  },
};

/**
 * Giriş kodunu gönderir. E-posta servisi yoksa geliştirmede kod yerel posta kutusuna (`dev_mailbox`) düşer ve `GET /v1/dev/otp` ile
 * okunur; üretimde servis yoksa giriş kapalıdır (503).
 */
export async function deliverOtp(
  env: Env,
  db: Pick<Queryable, 'query'>,
  defer: (work: Promise<unknown>) => void,
  { email, otp, locale }: { email: string; otp: string; locale: 'tr' | 'en' },
): Promise<void> {
  const t = copy[locale];
  const mail = { to: email, subject: t.subject(otp), text: t.text(otp) };
  if (env.RESEND_API_KEY) {
    // Gönderim beklenmez: yanıt süresi adresin kayıtlı olup olmadığını ele vermesin.
    defer(sendMail(env, mail));
    return;
  }
  if (env.ENVIRONMENT === 'development') {
    await insertDevMail(db, { id: newId(), email, subject: mail.subject, body: otp });
    return;
  }
  throw new APIError('SERVICE_UNAVAILABLE', { code: 'MAIL_UNAVAILABLE', message: 'Mail service is not configured' });
}
