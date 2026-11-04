import { hitRateLimit } from '@koina/db/repositories/site';
import type { AppContext } from '../types/env';
import { clientKey } from './client-key';
import { sha256 } from './crypto';
import { fail } from './errors';

/**
 * Sabit pencereli sayaç: `windowSeconds` içinde `max`ı aşan istek 429 alır. `subject` verilirse (üye kimliği, e-posta) sayaç ona,
 * verilmezse istemcinin günlük IP özetine bağlanır.
 */
export async function rateLimit(c: AppContext, scope: string, max: number, windowSeconds: number, subject?: string): Promise<void> {
  const who = subject ? await sha256(subject) : await clientKey(c);
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const count = await hitRateLimit(c.get('db'), `${scope}:${who}`, windowStart);
  if (count > max) fail('RATE_LIMITED');
}
