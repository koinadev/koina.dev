import { Hono } from 'hono';
import type { AppEnv } from '../../../core/types/env';
import { devOtp } from '../service/dev-otp';

/** Better Auth'un kendi uçları (`/v1/auth/*`): kod gönderme, kodla giriş, oturum, çıkış. */
export const authRoutes = new Hono<AppEnv>().on(['GET', 'POST'], '/*', (c) => c.get('auth')().handler(c.req.raw));

export const devRoutes = new Hono<AppEnv>().get('/otp', (c) => devOtp(c));
