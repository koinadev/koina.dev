import type { createLink as createLinkSchema } from '@koina/shared/api';
import type { z } from 'zod';
import { findLinkIdByHash, insertLink } from '@koina/db/repositories/links';
import { requireMember } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { newId, sha256 } from '../../../core/utils/crypto';
import { fail } from '../../../core/utils/errors';
import { rateLimit } from '../../../core/utils/rate-limit';
import { linksPerDay } from '../../moderation/domain/spam-rules';
import { assertCleanText } from '../../moderation/service/screen-content';
import { canonicalUrl } from '../../previews/domain/canonical-url';
import { isPublicHttpUrl } from '../../previews/domain/safe-url';
import { getPreview } from '../../previews/service/get-preview';
import { loadLinks } from '../utils/load-links';

/**
 * Faydalı bağlantı ekler. Görsel ve site adı istemciden değil önizlemeden gelir (başkasının sunucusuna istek attırılamaz, sahte
 * görsel eklenemez). Aynı kaynak ikinci kez eklenmez: `CONFLICT` ve var olanın kimliği döner.
 */
export async function createLink(c: AppContext, input: z.output<typeof createLinkSchema>): Promise<Response> {
  const member = requireMember(c);
  if (!isPublicHttpUrl(input.url)) fail('INVALID_INPUT');
  assertCleanText(input.title, input.description, ...input.tags);
  await rateLimit(c, 'link', linksPerDay(member.trust), 86_400, member.id);
  const db = c.get('db');
  const urlHash = await sha256(canonicalUrl(input.url));
  const existing = await findLinkIdByHash(db, urlHash);
  if (existing) fail('CONFLICT', { id: existing.id });
  const preview = await getPreview(c, input.url).catch(() => null);
  const id = newId();
  await insertLink(db, {
    id,
    userId: member.id,
    url: input.url,
    urlHash,
    title: input.title,
    description: input.description,
    image: preview?.image ?? null,
    siteName: preview?.siteName ?? '',
    category: input.category,
    tags: [...new Set(input.tags)],
  });
  const [link] = await loadLinks(c, [id]);
  return c.json(link, 201);
}
