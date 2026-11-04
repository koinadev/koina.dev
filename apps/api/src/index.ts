import { createConfig, createDb } from '@koina/db';
import { postgresDriver } from '@koina/db/drivers/postgres';
import { pruneRateLimits } from '@koina/db/repositories/site';
import { createApp } from './app';
import type { Env } from './core/types/env';
import { sweepOrphanMedia } from './modules/media/service/sweep-media';

const app = createApp();

export default {
  fetch: app.fetch,
  /** Saatlik bakım: bağlanmamış görseller ve iki günden eski hız sınırı sayaçları. */
  async scheduled(_event, env, ctx) {
    const db = createDb(createConfig(env.HYPERDRIVE.connectionString), { driver: postgresDriver, pooler: 'assumed', poolMax: 1 });
    const work = (async () => {
      await sweepOrphanMedia(env, db);
      await pruneRateLimits(db, Math.floor(Date.now() / 1000) - 2 * 86_400);
    })().finally(() => db.close());
    ctx.waitUntil(work);
  },
} satisfies ExportedHandler<Env>;
