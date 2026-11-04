import { Hono } from 'hono';
import { sessionMiddleware } from './core/auth/session.middleware';
import { databaseMiddleware } from './core/database/database.middleware';
import { jsonBodyLimit } from './core/middleware/body-limit.middleware';
import { corsMiddleware } from './core/middleware/cors.middleware';
import { noStore, securityHeaders } from './core/middleware/headers.middleware';
import { originGuard } from './core/middleware/origin-guard.middleware';
import type { AppEnv } from './core/types/env';
import { errorHandler } from './core/utils/error-handler';
import { accountRoutes } from './modules/account/routes';
import { adminRoutes } from './modules/admin/routes';
import { authRoutes, devRoutes } from './modules/auth/routes';
import { eventRoutes } from './modules/events/routes';
import { requireFeature, unlockedFeatures } from './modules/features/service/get-features';
import { feedRoutes } from './modules/feed/routes';
import { tagRoutes } from './modules/feed/routes/tags';
import { linkRoutes } from './modules/links/routes';
import { mediaServeRoutes, mediaUploadRoutes } from './modules/media/routes';
import { memberRoutes } from './modules/members/routes';
import { moderationRoutes } from './modules/moderation/routes';
import { projectRoutes } from './modules/projects/routes';
import { analyticsRoutes, formRoutes, newsletterRoutes } from './modules/site/routes';
import { sitemapRoutes } from './modules/sitemap/routes';

/**
 * Koina API. Ara katman sırası: güvenlik başlıkları → CORS → gövde sınırı → istek başına veritabanı → oturum → CSRF köken
 * denetimi. Modüller `routes → service → repository (@koina/db)` düzenindedir; iş kuralları modülün `domain` klasöründe saftır.
 */
export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.use('*', securityHeaders, noStore);

  app.use('/v1/*', corsMiddleware);
  app.use('/v1/*', async (c, next) => (c.req.path === '/v1/media' ? next() : jsonBodyLimit(c, next)));
  app.use('/v1/*', databaseMiddleware, sessionMiddleware, originGuard);
  app.use('/media/*', databaseMiddleware);

  app.get('/', (c) => c.json({ name: 'koina-api', ok: true }));
  app.get('/health', (c) => c.json({ ok: true }));

  // Kilit sunucuda: arayüz gizlese de istek doğrudan atılabilir. Eşikler @koina/shared/features.
  app.get('/v1/features', async (c) => c.json(await unlockedFeatures(c)));
  for (const path of ['/v1/feed', '/v1/feed/*', '/v1/tags/*', '/v1/media', '/v1/me/bookmarks', '/v1/me/notifications', '/v1/me/notifications/*']) {
    app.use(path, requireFeature('feed'));
  }
  app.use('/v1/links/*', requireFeature('links'));
  app.use('/v1/links', requireFeature('links'));
  app.use('/v1/projects/*', requireFeature('projects'));
  app.use('/v1/projects', requireFeature('projects'));
  app.use('/v1/members/:handle/follow', requireFeature('follow'));

  app.route('/v1/auth', authRoutes);
  app.route('/v1/dev', devRoutes);
  app.route('/v1/me', accountRoutes);
  app.route('/v1/members', memberRoutes);
  app.route('/v1/feed', feedRoutes);
  app.route('/v1/tags', tagRoutes);
  app.route('/v1/media', mediaUploadRoutes);
  app.route('/v1/links', linkRoutes);
  app.route('/v1/projects', projectRoutes);
  app.route('/v1/events', eventRoutes);
  app.route('/v1/mod', moderationRoutes);
  app.route('/v1/sitemap', sitemapRoutes);
  app.route('/v1/forms', formRoutes);
  app.route('/v1/newsletter', newsletterRoutes);
  app.route('/v1/analytics', analyticsRoutes);
  app.route('/v1/admin', adminRoutes);
  app.route('/media', mediaServeRoutes);

  app.notFound((c) => c.json({ success: false, code: 'NOT_FOUND' }, 404));
  app.onError(errorHandler);
  return app;
}
