import type { Env } from '../types/env';

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

/** Resend ile e-posta gönderir. Anahtar yoksa `false` döner; ne yapılacağına çağıran karar verir. */
export async function sendMail(env: Env, mail: Mail): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [mail.to], subject: mail.subject, text: mail.text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
  return true;
}

/** Discord webhook'una kısa bir bildirim; hata gönderimi bozmaz. */
export async function notifyTeam(env: Env, content: string): Promise<void> {
  if (!env.NOTIFY_WEBHOOK) return;
  await fetch(env.NOTIFY_WEBHOOK, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: content.slice(0, 1900), allowed_mentions: { parse: [] } }),
  }).catch(() => undefined);
}
