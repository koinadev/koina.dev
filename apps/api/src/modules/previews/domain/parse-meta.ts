// HTML'den önizleme bilgisi: Open Graph, Twitter kartı, sonra düz `<title>` ve `description`. HTMLRewriter akış hâlinde okur;
// sayfanın tamamı belleğe alınmaz. Workers'ta ve Bun'da yerleşiktir.

export interface PageMeta {
  title: string;
  description: string;
  image: string | null;
  siteName: string;
}

const clean = (text: string, max: number) => text.replace(/\s+/g, ' ').trim().slice(0, max);

const decodeEntities = (text: string) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));

export async function parseMeta(response: Response, pageUrl: string): Promise<PageMeta> {
  const found: Record<string, string> = {};
  let title = '';
  let inTitle = false;
  const rewriter = new HTMLRewriter()
    .on('meta', {
      element(el) {
        const key = (el.getAttribute('property') ?? el.getAttribute('name') ?? '').toLowerCase();
        const content = el.getAttribute('content');
        if (key && content && !(key in found)) found[key] = content;
      },
    })
    .on('title', {
      element() {
        inTitle = true;
      },
      text(chunk) {
        if (inTitle) title += chunk.text;
        if (chunk.lastInTextNode) inTitle = false;
      },
    });
  await rewriter.transform(response).arrayBuffer();

  const pick = (...keys: string[]) => keys.map((k) => found[k]).find((v) => v && v.trim()) ?? '';
  const rawImage = pick('og:image', 'og:image:url', 'twitter:image', 'twitter:image:src');
  let image: string | null = null;
  if (rawImage) {
    try {
      const absolute = new URL(decodeEntities(rawImage), pageUrl);
      if (absolute.protocol === 'https:' || absolute.protocol === 'http:') image = absolute.toString().slice(0, 1000);
    } catch {
      image = null;
    }
  }
  return {
    title: clean(decodeEntities(pick('og:title', 'twitter:title') || title), 200),
    description: clean(decodeEntities(pick('og:description', 'twitter:description', 'description')), 400),
    image,
    siteName: clean(decodeEntities(pick('og:site_name', 'application-name')), 80),
  };
}
