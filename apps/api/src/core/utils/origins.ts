import type { Env } from '../types/env';

/** Tarayıcıdan gelebilecek kökler: izin listesi ve API'nin kendisi. */
export function allowedOrigins(env: Env): string[] {
  const list = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  return [...new Set([...list, new URL(env.API_URL).origin])];
}
