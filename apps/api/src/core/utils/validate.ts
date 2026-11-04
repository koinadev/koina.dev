import { zValidator } from '@hono/zod-validator';
import type { ZodType } from 'zod';
import { fail } from './errors';

/** Doğrulama hatasını sözleşmedeki `INVALID_INPUT` zarfına çevirir. */
export const jsonBody = <T extends ZodType>(schema: T) =>
  zValidator('json', schema, (result) => {
    if (!result.success) fail('INVALID_INPUT');
  });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Yol parametresindeki kimlik: biçimsizse veritabanına gitmeden 404 (bozuk uuid Postgres'te 500 olurdu). */
export function uuidParam(value: string): string {
  if (!UUID.test(value)) fail('NOT_FOUND');
  return value.toLowerCase();
}
