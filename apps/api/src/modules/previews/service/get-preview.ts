import type { LinkPreview } from '@koina/shared/api';
import { findPreview, savePreview } from '@koina/db/repositories/posts';
import type { AppContext } from '../../../core/types/env';
import { sha256 } from '../../../core/utils/crypto';
import { canonicalUrl } from '../domain/canonical-url';
import { fetchPageMeta } from './fetch-page';

const FRESH_MS = 7 * 86_400_000;

/** Bağlantı kartının anahtarı: sadeleştirilmiş adresin özeti. */
export const previewHash = async (url: string): Promise<string> => sha256(canonicalUrl(url));

/**
 * Önizleme: önbellekte tazeyse oradan, değilse sayfadan okunur ve saklanır. Okunamayan sayfa da `ok: false` olarak saklanır ki her
 * gönderide yeniden denenmesin. Okunamazsa `null`.
 */
export async function getPreview(c: AppContext, url: string): Promise<LinkPreview | null> {
  const hash = await previewHash(url);
  const db = c.get('db');
  const cached = await findPreview(db, hash);
  if (cached && Date.now() - cached.fetchedAt.getTime() < FRESH_MS) {
    return cached.ok
      ? { url: cached.url, title: cached.title, description: cached.description, image: cached.image, siteName: cached.siteName }
      : null;
  }
  const meta = await fetchPageMeta(url);
  const ok = !!meta && (meta.title.length > 0 || meta.description.length > 0);
  await savePreview(db, {
    hash,
    url,
    title: meta?.title ?? '',
    description: meta?.description ?? '',
    image: meta?.image ?? null,
    siteName: meta?.siteName ?? '',
    ok,
  });
  return ok && meta ? { url, ...meta } : null;
}
