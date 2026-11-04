import { createConfig, createDb } from '@koina/db';
import { postgresDriver } from '@koina/db/drivers/postgres';
import { createDbScope } from '@koina/db/middleware';
import { createMiddleware } from 'hono/factory';
import { createAuth, type Auth } from '../auth/create-auth';
import type { AppEnv } from '../types/env';
import { waitUntil } from '../utils/wait-until';

/**
 * İstek başına tek bağlantı açar ve yanıttan sonra kapatır: Workers'ta soketler istekler arasında paylaşılmaz. Hyperdrive bir
 * transaction-mode havuzlayıcıdır ama `ready()` sınaması onda doğrulanmamıştır, bu yüzden `pooler: 'assumed'`.
 *
 * `c.get('db')` ve `c.get('auth')()` aynı bağlantıyı kullanır; Better Auth ilk çağrıda kurulur, oturuma bakmayan istek bedelini
 * ödemez. `defer` ile verilen işler (bildirim, önizleme, denetim) bitmeden bağlantı kapanmaz.
 */
export const databaseMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const db = createDb(createConfig(c.env.HYPERDRIVE.connectionString), {
    driver: postgresDriver,
    pooler: 'assumed',
    poolMax: 1,
  });
  const background: Promise<unknown>[] = [];
  let auth: Auth | undefined;
  c.set('db', createDbScope(db));
  c.set('defer', (work) => void background.push(work.catch((error: unknown) => console.error('deferred', error))));
  c.set('auth', () => (auth ??= createAuth(c, db)));
  try {
    await next();
  } finally {
    const closing = Promise.allSettled(background)
      .then(() => db.close())
      .catch(() => undefined);
    await waitUntil(c, closing);
  }
});
