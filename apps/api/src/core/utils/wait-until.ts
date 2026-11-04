import type { AppContext } from '../types/env';

/** Workers'ta `waitUntil`; testlerde (Bun, yürütme bağlamı yok) iş beklenir. */
export async function waitUntil(c: AppContext, work: Promise<unknown>): Promise<void> {
  let ctx: { waitUntil(work: Promise<unknown>): void } | undefined;
  try {
    ctx = c.executionCtx;
  } catch {
    ctx = undefined;
  }
  if (ctx) ctx.waitUntil(work);
  else await work;
}
