import { AppError } from '@koina/db';
import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../types/env';

/** Sözleşme dışı hata: veritabanı ulaşılamıyorsa 503, diğerleri 500. SQL, parametre ve kişisel veri yanıta ve günlüğe yazılmaz. */
export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  if (err instanceof AppError && err.code.startsWith('DATABASE_')) {
    console.error('database', err.code);
    return c.json({ success: false, code: 'INTERNAL' }, 503);
  }
  console.error('unhandled', err instanceof Error ? err.name : 'unknown', err instanceof Error ? err.message.slice(0, 200) : '');
  return c.json({ success: false, code: 'INTERNAL' }, 500);
};
