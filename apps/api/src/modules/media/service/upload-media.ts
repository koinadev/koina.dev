import { MEDIA_BYTES, mediaMeta } from '@koina/shared/api';
import { insertMedia } from '@koina/db/repositories/posts';
import { requireMember } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { newId } from '../../../core/utils/crypto';
import { fail } from '../../../core/utils/errors';
import { mediaUrl } from '../../../core/utils/media-url';
import { rateLimit } from '../../../core/utils/rate-limit';
import { assertCleanText } from '../../moderation/service/screen-content';
import { EXTENSIONS, sniffImage, stripMetadata } from '../domain/image';

/**
 * Görsel yükler (çok parçalı form: `file`, `width`, `height`, `alt`). Tür baytlardan anlaşılır, meta veri çıkarılır, R2'ye yazılır.
 * Görsel bir gönderiye bağlanana kadar kimseye sunulmaz.
 */
export async function uploadMedia(c: AppContext): Promise<Response> {
  const member = requireMember(c);
  await rateLimit(c, 'media', member.trust === 0 ? 20 : 120, 3600, member.id);
  const declared = Number(c.req.header('content-length') ?? 0);
  if (declared > MEDIA_BYTES + 64 * 1024) fail('PAYLOAD_TOO_LARGE');
  const form = await c.req.formData().catch(() => fail('INVALID_INPUT'));
  const file = form.get('file');
  if (!(file instanceof File)) fail('INVALID_INPUT');
  if (file.size > MEDIA_BYTES) fail('PAYLOAD_TOO_LARGE');
  const meta = mediaMeta.safeParse({ width: form.get('width'), height: form.get('height'), alt: form.get('alt') ?? '' });
  if (!meta.success) fail('INVALID_INPUT');
  assertCleanText(meta.data.alt);

  const raw = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(raw);
  if (!type) fail('MEDIA_INVALID');
  const bytes = stripMetadata(raw, type);
  const id = newId();
  const key = `p/${id}.${EXTENSIONS[type]}`;
  await c.env.MEDIA.put(key, bytes, { httpMetadata: { contentType: type } });
  await insertMedia(c.get('db'), { id, userId: member.id, key, mime: type, bytes: bytes.length, ...meta.data });
  return c.json({ id, url: mediaUrl(c.env, key), width: meta.data.width, height: meta.data.height, alt: meta.data.alt }, 201);
}
