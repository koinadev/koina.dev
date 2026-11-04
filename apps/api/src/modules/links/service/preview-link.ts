import type { LinkDraft, linkPreviewInput } from '@koina/shared/api';
import type { z } from 'zod';
import { findLinkIdByHash } from '@koina/db/repositories/links';
import { requireMember } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { sha256 } from '../../../core/utils/crypto';
import { fail } from '../../../core/utils/errors';
import { rateLimit } from '../../../core/utils/rate-limit';
import { canonicalUrl } from '../../previews/domain/canonical-url';
import { isPublicHttpUrl } from '../../previews/domain/safe-url';
import { getPreview } from '../../previews/service/get-preview';

/** Ekleme formunun ön bilgisi: sayfanın başlığı, açıklaması, görseli; adres zaten eklenmişse var olanın kimliği. */
export async function previewLink(c: AppContext, { url }: z.output<typeof linkPreviewInput>): Promise<Response> {
  const member = requireMember(c);
  if (!isPublicHttpUrl(url)) fail('INVALID_INPUT');
  await rateLimit(c, 'link-preview', 60, 3600, member.id);
  const existing = await findLinkIdByHash(c.get('db'), await sha256(canonicalUrl(url)));
  const preview = await getPreview(c, url).catch(() => null);
  const draft: LinkDraft = {
    url,
    title: preview?.title ?? '',
    description: preview?.description ?? '',
    image: preview?.image ?? null,
    siteName: preview?.siteName ?? '',
    existing: existing?.id ?? null,
  };
  return c.json(draft);
}
