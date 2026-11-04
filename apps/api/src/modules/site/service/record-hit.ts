import type { analyticsHit } from '@koina/shared/api';
import type { z } from 'zod';
import { recordHit as recordHitRow } from '@koina/db/repositories/site';
import type { AppContext } from '../../../core/types/env';
import { rateLimit } from '../../../core/utils/rate-limit';

function referrerHost(raw: string | undefined, self: string | undefined): string {
  if (!raw) return '';
  try {
    const host = new URL(raw).hostname.replace(/^www\./, '');
    return host === self ? '' : host.slice(0, 100);
  } catch {
    return '';
  }
}

/** Çerezsiz sayaç: ne IP ne kimlik saklanır; yalnız gün + yol + olay + yönlendiren alan adı. Onay bandı gerektirmez. */
export async function recordHit(c: AppContext, input: z.output<typeof analyticsHit>): Promise<Response> {
  await rateLimit(c, 'hit', 120, 60);
  const origin = c.req.header('origin');
  const self = origin ? new URL(origin).hostname.replace(/^www\./, '') : undefined;
  await recordHitRow(c.get('db'), {
    day: new Date().toISOString().slice(0, 10),
    path: input.path.split(/[?#]/)[0]!,
    event: input.event ?? 'pageview',
    referrer: referrerHost(input.referrer, self),
  });
  return c.body(null, 204);
}
