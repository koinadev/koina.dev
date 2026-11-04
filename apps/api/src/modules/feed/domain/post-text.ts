import { MENTION_PATTERN, normalizeTag, TAG_PATTERN, URL_PATTERN } from '@koina/shared/api';

const MAX_TAGS = 10;
const MAX_MENTIONS = 10;

/** Gövdedeki `#etiket`ler: Türkçe küçük harf, tekil, en çok 10. */
export function extractTags(body: string): string[] {
  const tags = [...body.matchAll(TAG_PATTERN)].map((m) => normalizeTag(m[2]!));
  return [...new Set(tags)].slice(0, MAX_TAGS);
}

/** Gövdedeki `@kullanıcı` anmaları: tekil, en çok 10. Anılan üyenin var olup olmadığına veritabanı karar verir. */
export function extractMentions(body: string): string[] {
  return [...new Set([...body.matchAll(MENTION_PATTERN)].map((m) => m[2]!))].slice(0, MAX_MENTIONS);
}

/** Gövdedeki http(s) bağlantıları, sırayla. İlki bağlantı kartı olur. */
export function extractUrls(body: string): string[] {
  return [...body.matchAll(URL_PATTERN)].map((m) => m[0]);
}
