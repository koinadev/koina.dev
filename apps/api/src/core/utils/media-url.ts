import type { Env } from '../types/env';

/** Görselin herkese açık adresi: API'nin `/media/<anahtar>` ucu. */
export const mediaUrl = (env: Env, key: string): string => `${env.API_URL.replace(/\/$/, '')}/media/${key}`;
