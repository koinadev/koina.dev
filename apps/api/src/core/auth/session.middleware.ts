import { findMemberById } from '@koina/db/repositories/members';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types/env';

/** Kimlik bilgisi taşıyan istek mi: Bearer belirteci ya da oturum çerezi. Taşımayan istek Better Auth'u hiç kurmaz. */
const carriesSession = (headers: Headers) =>
  headers.get('authorization')?.startsWith('Bearer ') || (headers.get('cookie') ?? '').includes('koina.session_token');

/** Oturum varsa üyeyi `viewer`a yazar; yoksa `null`. Hata fırlatmaz: yetki gereken uç kendisi sorar. */
export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set('viewer', null);
  if (carriesSession(c.req.raw.headers)) {
    const session = await c.get('auth')().api.getSession({ headers: c.req.raw.headers });
    if (session) c.set('viewer', await findMemberById(c.get('db'), session.user.id));
  }
  await next();
});
