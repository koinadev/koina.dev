import type { Env } from '../types/env';

/** Turnstile belirtecini Cloudflare'de doğrular. Sır yoksa `null`: çağıran kapalı mı açık mı davranacağını seçer. */
export async function verifyTurnstile(env: Env, token: string, ip: string | undefined): Promise<boolean | null> {
  if (!env.TURNSTILE_SECRET) return null;
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const data = (await res.json().catch(() => null)) as { success?: boolean } | null;
  return data?.success === true;
}
