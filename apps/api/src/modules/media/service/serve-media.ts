import { findMediaByKey } from '@koina/db/repositories/posts';
import type { AppContext } from '../../../core/types/env';
import { fail } from '../../../core/utils/errors';

const KEY = /^p\/[0-9a-f-]{36}\.(jpg|png|webp|gif)$/;

/**
 * Görseli sunar: yalnız görünür bir gönderiye bağlıysa. Tür kayıttan gelir, tarayıcı tahmin etmez; görsel belge gibi açılsa da
 * betik çalıştıramaz. Önbellek bir gün: gizlenen gönderinin görseli de bir gün içinde ara belleklerden düşer.
 */
export async function serveMedia(c: AppContext): Promise<Response> {
  const key = c.req.path.replace(/^\/media\//, '');
  if (!KEY.test(key)) fail('NOT_FOUND');
  const row = await findMediaByKey(c.get('db'), key);
  if (!row || !row.postId || row.status !== 'visible') fail('NOT_FOUND');
  const object = await c.env.MEDIA.get(key);
  if (!object) fail('NOT_FOUND');
  return new Response(object.body, {
    headers: {
      'content-type': row.mime,
      'cache-control': 'public, max-age=86400',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox",
      'cross-origin-resource-policy': 'cross-origin',
      'content-disposition': 'inline',
      etag: object.httpEtag,
    },
  });
}
