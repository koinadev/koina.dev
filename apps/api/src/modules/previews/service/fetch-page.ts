import { isPublicHttpUrl } from '../domain/safe-url';
import { parseMeta, type PageMeta } from '../domain/parse-meta';

const MAX_REDIRECTS = 3;
const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 4000;
const USER_AGENT = 'KoinaBot/1.0 (+https://koina.dev)';

/** Gövdeyi en çok `MAX_BYTES` okuyan yanıt: büyük sayfa belleği doldurmaz, fazlası kesilir. */
function capped(response: Response): Response {
  const reader = response.body!.getReader();
  let seen = 0;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done || seen >= MAX_BYTES) {
        controller.close();
        await reader.cancel().catch(() => undefined);
        return;
      }
      seen += value.byteLength;
      controller.enqueue(value);
    },
  });
  return new Response(stream, { headers: response.headers });
}

/**
 * Sayfayı güvenle çeker ve önizleme bilgisini okur: her yönlendirme yeniden denetlenir (en çok 3), yalnız HTML, 4 sn, 512 KB.
 * Okunamazsa `null`.
 */
export async function fetchPageMeta(url: string): Promise<PageMeta | null> {
  let current = url;
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!isPublicHttpUrl(current)) return null;
    const response = await fetch(current, {
      redirect: 'manual',
      signal,
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
    }).catch(() => null);
    if (!response) return null;
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel().catch(() => undefined);
      if (!location) return null;
      current = new URL(location, current).toString();
      continue;
    }
    const type = response.headers.get('content-type') ?? '';
    if (!response.ok || !response.body || !/text\/html|application\/xhtml/i.test(type)) {
      await response.body?.cancel().catch(() => undefined);
      return null;
    }
    return parseMeta(capped(response), current).catch(() => null);
  }
  return null;
}
