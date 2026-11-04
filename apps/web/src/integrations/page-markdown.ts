import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { Window } from 'happy-dom';

import { hashParts, openCache, resolveCacheDir, sourceVersion } from '../lib/build-cache';
import {
  contentRoot,
  extractMeta,
  htmlToMarkdown,
  isIndexable,
  markdownBodyFromSource,
  markdownPathFor,
  parseFrontMatter,
  renderMarkdownDocument,
  type DomDocument,
  type PageMeta,
} from '../lib/page-markdown';

/**
 * Her sayfanın yanına `.md` ikizini yazan Astro entegrasyonu (`astro:build:done`).
 *
 * NEDEN ENTEGRASYON, `postbuild` SCRIPT'İ DEĞİL: `postbuild` yalnızca `bun run build` çağrıldığında
 * çalışır. `astro build` doğrudan çalıştırıldığında, monorepo'nun `bun --filter '*' build`
 * zincirinde ya da ileride başka bir build yolu eklendiğinde `.md` dosyaları SESSİZCE üretilmezdi
 * ve deploy yine yeşil görünürdü. Entegrasyon build'in kendisine bağlı: sayfa üretilen her yerde
 * ikizi de üretilir.
 *
 * NEDEN `astro:build:done`: sayfa listesi (`pages`) ve çıktı dizini (`dir`) o an elde. `dist/`i
 * elle yürüyüp "bu HTML gerçekten bir sayfa mı" diye tahmin etmek gerekmiyor.
 *
 * Ayıklama ve markdown üretimi `src/lib/page-markdown.ts` içinde; bu dosya yalnızca tetikleyici,
 * dosya yazımı ve raporlama.
 */

/** Blog yazılarının markdown KAYNAĞI. Bulunursa HTML'den geri çevirmek yerine kaynak kullanılır. */
const BLOG_SOURCE_ROOTS = ['content/blog', 'src/content/blog'];

/** Gövdesi bu eşiğin altında kalan sayfa, ayıklamanın kırıldığı anlamına gelir; build durur. */
const MINIMUM_BODY_LENGTH = 40;

/**
 * Metin yüzeyinin karakter kümesi — `dist/_headers`a eklenen blok.
 *
 * NEDEN: Workers Static Assets `Content-Type`ı yalnızca uzantıdan türetir ve `charset` EKLEMEZ:
 * `.md` → `text/markdown`, `.txt` → `text/plain`. HTML'deki `<meta charset>` gibi bir iç işaret
 * bu dosyalarda yok; tarayıcı `charset`siz metni windows-1252 sayar ve Türkçe harfler
 * (ı, ş, ğ, İ) `Ä±`, `ÅŸ` gibi bozuk görünür. `.txt` de burada: `llms.txt`/`robots.txt`
 * endpoint'lerindeki `charset=utf-8` statik build'de dosyaya yazılırken DÜŞER, sunulan yanıtta
 * yine yalnızca `text/plain` kalır. `_headers` kuralları varsayılan başlığı EZER (ekleme değil).
 */
const CHARSET_HEADERS = [
  '/*.md',
  '  Content-Type: text/markdown; charset=utf-8',
  '',
  '/*.txt',
  '  Content-Type: text/plain; charset=utf-8',
  '',
].join('\n');

/**
 * Bloğu `dist/_headers`ın SONUNA ekler; `public/_headers` varsa (Astro onu build'de kopyalar)
 * içindeki kurallar korunur. Blok zaten varsa dokunulmaz — build aynı `dist/` üstünde tekrar
 * koşsa da kural çoğalmaz.
 */
function ensureCharsetHeaders(distRoot: string): void {
  const path = join(distRoot, '_headers');
  const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
  if (current.includes(CHARSET_HEADERS)) return;
  const separator = current === '' ? '' : current.endsWith('\n') ? '\n' : '\n\n';
  writeFileSync(path, `${current}${separator}${CHARSET_HEADERS}`, 'utf8');
}

function parse(html: string): DomDocument {
  // JS ve harici kaynak yüklemesi KAPALI: entegrasyon sayfayı ÇALIŞTIRMIYOR, okuyor. Açık
  // bırakılsaydı her sayfanın satır içi script'i ayrıştırma sırasında yorumlanırdı — matkolog'un
  // 1.100 sayfasında saniyeler yerine dakikalar demek.
  const window = new Window({
    url: 'https://localhost/',
    settings: {
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
    },
  });
  window.document.write(html);
  return window.document as unknown as DomDocument;
}

/**
 * Blog kaynaklarını `<dil>/<slug>` anahtarıyla indeksler.
 *
 * İki yerleşim de destekleniyor: sayfa demeti (`<dil>/<slug>/index.md`, görselleri yanında) ve düz
 * dosya (`<dil>/<slug>.mdx`). Frontmatter'da `slug` alanı varsa o da anahtar olarak eklenir —
 * dosya adı ile yayımlanan slug ayrıştığında eşleşme yine kurulsun diye.
 */
function indexBlogSources(projectRoot: string): Map<string, string> {
  const index = new Map<string, string>();
  for (const relativeRoot of BLOG_SOURCE_ROOTS) {
    const root = resolve(projectRoot, relativeRoot);
    if (!existsSync(root)) continue;
    const walk = (directory: string, segments: string[]) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          walk(path, [...segments, entry.name]);
          continue;
        }
        if (!/\.mdx?$/.test(entry.name)) continue;
        const bare = entry.name.replace(/\.mdx?$/, '');
        const parts = bare === 'index' ? segments : [...segments, bare];
        if (parts.length < 2) continue;
        index.set(`${parts[0]}/${parts[parts.length - 1]}`, path);
        const declared = parseFrontMatter(readFileSync(path, 'utf8')).data.slug;
        if (declared) index.set(`${parts[0]}/${declared}`, path);
      }
    };
    walk(root, []);
  }
  return index;
}

/** Sayfa bir blog YAZISI mı? `/…/blog/<slug>` — dizin sayfası (`/blog`) yazı değildir. */
function blogSourceKey(meta: PageMeta): string | null {
  const segments = new URL(meta.url).pathname.split('/').filter(Boolean);
  const blogIndex = segments.lastIndexOf('blog');
  if (blogIndex === -1 || blogIndex !== segments.length - 2) return null;
  const locale = (meta.locale.split('-')[0] || segments[0] || '').toLowerCase();
  return locale ? `${locale}/${segments[segments.length - 1]}` : null;
}

/**
 * Bir sayfa yolunun HANGİ dosyaya yazıldığını bulur.
 *
 * İki olasılık DENENİYOR, `build.format` okunmuyor: bu ailede iki biçim de kullanımda
 * (`dist/tr/hakkinda.html` ve `dist/about/index.html`) ve dosyanın kendisi tek doğruluk kaynağı.
 * Yapılandırmadan çıkarım yapmak, biçim değiştiğinde sessizce yanlış dosyayı okurdu.
 */
function htmlFileFor(distRoot: string, pathname: string): string | null {
  const clean = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  const candidates = clean ? [`${clean}.html`, `${clean}/index.html`] : ['index.html'];
  return candidates.find((candidate) => existsSync(join(distRoot, candidate))) ?? null;
}

/** Önbelleğe yazılan sonuç: ikiz ya da "bu sayfa ikiz almaz" kararı. Hatalar ASLA saklanmaz. */
type TwinOutcome =
  | { kind: 'skip' }
  | { kind: 'markdown'; text: string; fromSource: boolean }
  | { kind: 'problem'; message: string };

/**
 * Yol, yazı sayfasına benziyorsa (`…/blog/<slug>`) o slug'ı taşıyan TÜM kaynak dosyaları verir.
 * Yalnızca önbellek anahtarı içindir: gerçek eşleşme ayrıştırılmış `meta`dan yapılır, ama kaynak
 * dosyanın içeriği HTML'e yansımasa bile anahtara girsin diye burada geniş (dil bağımsız) tutulur.
 */
function sourceFilesForPath(pathname: string, sources: Map<string, string>): string[] {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < 2 || segments[segments.length - 2] !== 'blog') return [];
  const slug = segments[segments.length - 1];
  return [...sources].filter(([key]) => key.endsWith(`/${slug}`)).map(([, path]) => path);
}

/** Bir sayfa için ikiz üretir. Saf: aynı HTML + kaynak + kod → aynı sonuç, yani önbelleklenebilir. */
function buildTwin(html: string, htmlPath: string, sources: Map<string, string>): TwinOutcome {
  const document = parse(html);
  // `noindex` sayfalar (404, kök dil yönlendirme stub'ı) ikiz ALMAZ: cevap motoruna
  // sunulmayacak bir sayfanın makine okunur kopyası yalnızca gürültü olurdu.
  const meta = isIndexable(document) ? extractMeta(document) : null;
  if (!meta) return { kind: 'skip' };

  const sourcePath = sources.get(blogSourceKey(meta) ?? '');
  let body: string;
  if (sourcePath) {
    const parsed = parseFrontMatter(readFileSync(sourcePath, 'utf8'));
    body = markdownBodyFromSource(parsed.body, meta);
    // Kaynak gövdesinde H1 YOKTUR — başlık frontmatter'da durur ve sayfayı render eden
    // bileşen basar; ikizde de aynı başlık en üste konmazsa dosya başlıksız kalırdı.
    if (parsed.data.title) body = `# ${parsed.data.title}\n\n${body}`;
    meta.published = meta.published ?? parsed.data.date ?? parsed.data.publishedAt;
    meta.modified = meta.modified ?? parsed.data.updated;
  } else {
    const root = contentRoot(document);
    body = root ? htmlToMarkdown(root, meta.url) : '';
  }

  if (body.length < MINIMUM_BODY_LENGTH) {
    return {
      kind: 'problem',
      message: `${htmlPath}: markdown gövdesi boş ya da fazla kısa (${body.length})`,
    };
  }
  return { kind: 'markdown', text: renderMarkdownDocument(meta, body), fromSource: !!sourcePath };
}

export default function pageMarkdown(): AstroIntegration {
  let projectRoot = process.cwd();

  return {
    name: 'page-markdown',
    hooks: {
      'astro:config:done': ({ config }) => {
        projectRoot = fileURLToPath(config.root);
      },
      'astro:build:done': ({ dir, pages, logger }) => {
        const distRoot = fileURLToPath(dir);
        const sources = indexBlogSources(projectRoot);
        const problems: string[] = [];
        let written = 0;
        let fromSource = 0;
        let skipped = 0;
        let withoutDocument = 0;

        // İkiz, sayfanın HTML'inin (+ varsa blog kaynağının + ayıklayıcı kodunun) saf fonksiyonu.
        // Build hook'u sürekli koşarken değişmeyen sayfanın HTML'i ayrıştırılmaz (happy-dom
        // sayfa başına en pahalı adım): hash'i tutan kayıt doğrudan yazılır.
        const cache = openCache('markdown', resolveCacheDir(projectRoot));
        const codeVersion = sourceVersion(
          projectRoot,
          'src/lib/page-markdown.ts',
          'src/integrations/page-markdown.ts',
        );

        for (const page of pages) {
          const htmlPath = htmlFileFor(distRoot, page.pathname);
          // Bir rota BELGE ÜRETMEDEN de geçerli olabilir: edumoodup'ta `/tr/` yalnızca
          // `Astro.redirect('/')` çalıştırır ve statik çıktıda ortada bir HTML bırakmaz.
          // Burada hata vermek build'i kırardı; ortada ayıklanacak sayfa yok, sayılıp geçiliyor.
          if (!htmlPath) {
            withoutDocument += 1;
            continue;
          }

          const html = readFileSync(join(distRoot, htmlPath), 'utf8');
          const key = hashParts(
            codeVersion,
            html,
            ...sourceFilesForPath(page.pathname, sources).map((path) => readFileSync(path)),
          );

          const stored = cache.get(key);
          let outcome: TwinOutcome | null = null;
          if (stored) {
            try {
              outcome = JSON.parse(stored.toString('utf8')) as TwinOutcome;
            } catch {
              outcome = null; // bozuk kayıt MISS sayılır
            }
          }
          if (!outcome) {
            outcome = buildTwin(html, htmlPath, sources);
            if (outcome.kind !== 'problem') cache.put(key, JSON.stringify(outcome));
          }

          if (outcome.kind === 'skip') {
            skipped += 1;
          } else if (outcome.kind === 'problem') {
            problems.push(outcome.message);
          } else {
            const target = join(distRoot, markdownPathFor(htmlPath));
            mkdirSync(dirname(target), { recursive: true });
            writeFileSync(target, outcome.text, 'utf8');
            written += 1;
            if (outcome.fromSource) fromSource += 1;
          }
        }

        // Sessiz geçmek YOK: gövdesi çıkmayan bir sayfa, ayıklama kurallarının o sayfada
        // kırıldığı anlamına gelir ve boş bir `.md` yayımlamak hiç yayımlamamaktan kötüdür.
        if (problems.length > 0) {
          throw new Error(`Markdown aynası üretilemedi:\n${problems.join('\n')}`);
        }

        ensureCharsetHeaders(distRoot);

        logger.info(
          `${written} sayfa markdown ikizi yazıldı (${fromSource} blog yazısı kaynaktan, ` +
            `${skipped} noindex sayfa atlandı, ${withoutDocument} rota belge üretmedi).`,
        );
      },
    },
  };
}
