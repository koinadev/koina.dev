import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';

import { parseFrontMatter } from '../lib/page-markdown';

/**
 * `.md` SAYFA İKİZLERİ SÖZLEŞMESİ.
 *
 * Cevap motorlarına ve ajanlara sunulan yüzey artık yalnızca HTML değil: build sırasında
 * `src/integrations/page-markdown.ts` her sayfanın yanına, adresinin sonuna `.md` eklenmiş bir
 * markdown ikizi yazıyor. Test ÇIKTI üstünde koşuyor, kaynak üstünde değil — sözleşme "şablon
 * şunu render ediyor" değil, "yayına giden dosya şunu içeriyor".
 *
 * TEMSİLCİ SAYFALAR ELLE YAZILMIYOR, ÇIKTIDAN SEÇİLİYOR. Sabit yollar (`tr/hakkinda.md` gibi)
 * ilk özellik çıkarmasında ölürdü: `i18n` sökülünce `src/pages/tr` köke taşınır ve `/tr/...`
 * adresleri tümüyle kaybolur. Türetilen seçim hem çıkarma matrisinde hem de bu dosyanın kardeş
 * depolara kopyalanmasında ayakta kalır.
 */

const root = resolve(import.meta.dirname, '../..');
const dist = resolve(root, 'dist');

/** Ham HTML kalıntısı arayan kalıp — markdown çıktısında hiçbiri bulunmamalı. */
const RAW_HTML =
  /<\/?(?:div|span|p|a|section|article|header|footer|nav|ul|ol|li|img|h[1-6]|script|style|button|main|table)\b/i;

/** İkiz olduğunu kanıtlayan imza: entegrasyonun yazdığı frontmatter'ın ilk iki satırı. */
const TWIN_SIGNATURE = '---\nurl: "';

function walk(directory: string, prefix = ''): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return walk(join(directory, entry.name), path);
    return [path];
  });
}

function read(relativePath: string): string {
  return readFileSync(join(dist, relativePath), 'utf8');
}

function documentOf(relativePath: string) {
  const window = new Window({
    url: 'https://localhost/',
    settings: {
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
    },
  });
  window.document.write(read(relativePath));
  return window.document;
}

function squash(text: string): string {
  return text.replace(/\s+/g, '');
}

/** `dist/about/index.html` → `dist/about.md`; `dist/tr/hakkinda.html` → `dist/tr/hakkinda.md`. */
function twinOf(htmlPath: string): string {
  if (htmlPath === 'index.html') return 'index.md';
  if (htmlPath.endsWith('/index.html')) return `${htmlPath.slice(0, -'/index.html'.length)}.md`;
  return `${htmlPath.slice(0, -'.html'.length)}.md`;
}

let files: string[] = [];
let indexable: string[] = [];
let twins: string[] = [];

beforeAll(() => {
  // Testler `dist/` üstünde koşar; yoksa bir kez üretilir. Bu kalıp bu depolarda yerleşik
  // (matkolog `setup-build.ts`, furkancolak `portfolio-direct-load.test.ts`) — çıktı sözleşmesini
  // doğrulayan bir testin çıktının varlığını varsayması, temiz bir checkout'ta sessiz kırılmadır.
  if (!existsSync(join(dist, 'index.html'))) {
    execFileSync('bun', ['run', 'build'], { cwd: root, stdio: 'pipe' });
  }
  files = walk(dist);
  indexable = files.filter((file) => {
    if (!file.endsWith('.html')) return false;
    const html = read(file);
    // `noindex` sayfalar (404, kök dil yönlendirme stub'ı) ikiz ALMAZ: cevap motoruna
    // sunulmayacak bir sayfanın makine okunur kopyası yalnızca gürültü olurdu.
    return !/name="robots"[^>]*content="[^"]*noindex/i.test(html) && html.includes('rel="canonical"');
  });
  // İkizler uzantıdan değil KENDİ frontmatter'ından tanınıyor: `public/` altından olduğu gibi
  // kopyalanan elle yazılmış bir `.md` (kardeş depolarda var) sayımı bozardı.
  twins = files.filter((file) => file.endsWith('.md') && read(file).startsWith(TWIN_SIGNATURE));
}, 900_000);

/** Temsilci içerik sayfası: blog dışı, gövdesi en uzun indekslenebilir sayfa. */
function contentPage(): string {
  const candidates = indexable.filter((file) => !/(^|\/)blog\//.test(file));
  return candidates.sort((left, right) => read(twinOf(right)).length - read(twinOf(left)).length)[0];
}

/**
 * Sayfa çevresinden bir cümle — ÇIKTIDAN türetiliyor, elle yazılmıyor.
 *
 * Alt bilgi tanım gereği künye/gezinme yüzeyidir; oradaki en uzun metin ikizde görünüyorsa
 * ayıklama kırılmış demektir. Metni elle sabitlemek her sitede ayrı bir cümle tutmak ve ilk
 * metin değişikliğinde yanlış kırmızı almak olurdu.
 */
function chromeText(htmlPath: string): string {
  const document = documentOf(htmlPath);
  return [...document.querySelectorAll('footer')]
    .flatMap((footer) => [...footer.querySelectorAll('p, div, span, a, li')])
    .map((element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim())
    .filter((text) => text.length >= 25)
    .sort((left, right) => right.length - left.length)[0];
}

describe('sayfa markdown ikizleri', () => {
  it('indekslenebilir her sayfanın tam olarak bir ikizi vardır', () => {
    expect(indexable.length).toBeGreaterThan(0);
    expect(twins.sort()).toEqual(indexable.map(twinOf).sort());
  });

  it('her ikiz frontmatter ile başlar, bir H1 taşır ve ham HTML içermez', () => {
    for (const twin of twins) {
      const markdown = read(twin);
      // Frontmatter ilk satırda: dosyayı akışla okuyan bir ajan adresi gövdeyi beklemeden görür.
      expect(markdown, twin).toMatch(/^---\nurl: "https?:\/\/[^"]+"\n/);
      expect(markdown, twin).toMatch(/^# .+$/m);
      expect(markdown, twin).not.toMatch(RAW_HTML);
      // Göreli adres KALMAZ: `.md` sayfadan başka bir adreste servis ediliyor, göreli bağlantı
      // orada farklı bir yere çözülürdü. Frontmatter ayıklanıyor, çünkü `url:` alanı kendisi
      // mutlak bir adres taşır ve kalıbın aradığı şey GÖVDEDEKİ bağlantılar.
      expect(markdown.replace(/^---\n[\s\S]*?\n---\n/, ''), twin).not.toMatch(
        /\]\((?!https?:|mailto:|tel:)[^)]*\)/,
      );
    }
  });

  it('ikizler ve .txt dosyaları utf-8 charset başlığıyla sunulur', () => {
    // Workers Static Assets `.md`yi `text/markdown`, `.txt`yi `text/plain` olarak `charset`SİZ
    // sunuyor; tarayıcı bunu windows-1252 sayar ve Türkçe harfler bozulur (ı → Ä±). Başlık
    // `_headers` ile ezilmezse ikizlerin tamamı canlıda okunmaz hâle gelir.
    const headers = read('_headers');
    expect(headers).toMatch(/^\/\*\.md\n {2}Content-Type: text\/markdown; charset=utf-8$/m);
    expect(headers).toMatch(/^\/\*\.txt\n {2}Content-Type: text\/plain; charset=utf-8$/m);
    // Blok bir kez bulunur: `public/_headers` varsa üstüne eklenir, çoğaltılmaz.
    expect(headers.match(/^\/\*\.md$/gm)).toHaveLength(1);
  });

  it('temsilci içerik sayfası kanonik adresi ve sayfanın gerçek başlığını taşır', () => {
    const page = contentPage();
    const document = documentOf(page);
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
    const heading = document.querySelector('h1')?.textContent ?? '';
    const markdown = read(twinOf(page));

    expect(canonical).toBeTruthy();
    expect(heading.trim().length).toBeGreaterThan(0);
    expect(markdown).toContain(`url: "${canonical}"`);
    // Başlık boşluk duyarsız aranıyor: kaynakta `<br>` ile bölünmüş başlıklar var ve markdown
    // onları tek satıra indiriyor — boşluk üzerinden karşılaştırmak yanlış kırmızı verirdi.
    expect(squash(markdown), page).toContain(squash(heading));
    expect(markdown.length).toBeGreaterThan(300);
  });

  it('menü ve alt bilgi metni ikize sızmaz', () => {
    const page = contentPage();
    const chrome = chromeText(page);
    // Testin bir şey ölçtüğünün kanıtı: sayfada gerçekten bir alt bilgi metni bulundu.
    expect(chrome, `${page}: alt bilgi metni bulunamadı`).toBeTruthy();
    expect(read(twinOf(page))).not.toContain(chrome);
  });

  it('frontmatter kaçışları çözülür, ikize ham ters bölü sızmaz', () => {
    // YAML'ın çift tırnaklı skalerinde `\\"` bir TIRNAK KARAKTERİDİR. Yalnızca dış tırnakları
    // kırpan bir ayrıştırıcı ters bölüyü metinde bırakır ve başlığında tırnak geçen bir yazı
    // `# Siteniz \\"az kaldı\\" değil` diye yayımlanırdı — ham kaçış, okunur metin değil.
    expect(parseFrontMatter('---\ntitle: "a \\"b\\" c"\n---\ngövde').data.title).toBe('a "b" c');
    // Tek tırnaklı skalerde kaçış YOKTUR; tırnağın kendisi ikilenir.
    expect(parseFrontMatter("---\ntitle: 'a''b'\n---\ngövde").data.title).toBe("a'b");

    // Sözleşme çıktı üstünde de kilitleniyor: ayrıştırıcı ileride değişse bile yayına giden
    // hiçbir başlıkta kaçış kalıntısı olmamalı.
    for (const twin of twins) {
      const heading = read(twin)
        .split('\n')
        .find((line) => line.startsWith('# '));
      expect(heading, `${twin}: H1 yok`).toBeTruthy();
      expect(heading, `${twin}: başlıkta ham kaçış kaldı`).not.toMatch(/\\["'\\]/);
    }
  });

  /* @feature:blog */
  it('blog yazısının ikizi markdown KAYNAĞINDAN üretilir', () => {
    // Kaynak dosyalar `<kök>/content/blog/<dil>/<slug>/index.md` olarak durur. İkizin gövdesi
    // HTML'den geri çevrilseydi kaynaktaki cümle tipografik dönüşümlerle ayrışırdı; bu test
    // gövdenin GERÇEKTEN kaynak dosyadan geldiğini kilitliyor.
    const sources = walk(resolve(root, 'content/blog')).filter((file) => file.endsWith('index.md'));
    expect(sources.length).toBeGreaterThan(0);

    // YAZI `sources[0]` DEĞİL, ÖLÇÜTÜ SAĞLAYAN İLK KAYNAK. Gövde kanıtı "kaynaktaki uzun bir
    // cümlenin ikizde BİREBİR bulunması" üzerine kurulu, ama şablonun her yazısında 80
    // karakterden uzun bir satır YOK: `en/speed-optimization` gövdesindeki en uzun satır 77
    // karakter. `sources[0]`e sabitlenmiş seçim testi yazının İÇERİĞİNE değil `readdirSync`
    // SIRASINA bağlıyordu ve ürün doğruyken kırmızı dönüyordu (ölçüldü: hem şablonda hem
    // `--lang=en` üretiminde — orada `tr/` tarafı silindiği için elde yalnız o yazı kalıyor).
    // Dosya adı sabitlemek de çözüm değil: bu dosya kardeş depolara kopyalanıyor ve orada blog
    // içeriği tümüyle başka. Bu yüzden seçim, dosyanın ADINDAN değil ÖLÇÜTÜNDEN türetiliyor.
    const candidates = sources.map((file) => {
      const source = readFileSync(resolve(root, 'content/blog', file), 'utf8');
      return {
        file,
        // Başlık, ikizi üreten AYNI ayrıştırıcıyla okunuyor: elle yazılmış bir regex kaçışları
        // çözmez ve tırnak geçen bir başlıkta test kendi kendine yanlış kırmızı verirdi.
        title: parseFrontMatter(source).data.title ?? '',
        sentence: source
          .split(/^---\s*$/m)
          .slice(2)
          .join('---')
          .split('\n')
          .map((line) => line.trim())
          .find((line) => line.length > 80 && !line.startsWith('#')),
      };
    });
    // Hiçbir kaynak ölçütü sağlamıyorsa test SESSİZCE geçmez: kanıt kalmadığı için gürültülü
    // düşer ve içeriği kısaltan kişiye eşiği söyler.
    const picked = candidates.find(({ title, sentence }) => title.length > 0 && sentence);
    expect(
      picked,
      'Hiçbir blog kaynağında 80 karakterden uzun gövde satırı yok — ikizin gövde kanıtı kurulamaz.',
    ).toBeTruthy();
    const { file, title, sentence } = picked as (typeof candidates)[number];

    const [locale, slug] = file.split('/');
    // Dil, yolun içinde `includes` ile ARANMIYOR: `tr` iki harflik bir dizi ve pekâlâ bir slug'ın
    // ortasında geçebilir. Eşleşme ikizin kendi `locale` alanından kuruluyor.
    const post = indexable
      .filter((candidate) => new RegExp(`(^|/)blog/${slug}(/index)?\\.html$`).test(candidate))
      .find((candidate) => new RegExp(`^locale: "${locale}`, 'm').test(read(twinOf(candidate))));
    expect(post, `${locale}/${slug} için üretilmiş sayfa yok`).toBeTruthy();

    const canonical = documentOf(post as string)
      .querySelector('link[rel="canonical"]')
      ?.getAttribute('href');
    const markdown = read(twinOf(post as string));

    expect(markdown).toContain(`url: "${canonical}"`);
    expect(markdown).toContain(`# ${title}`);
    expect(markdown).toContain(sentence as string);
  });
  /* @/feature:blog */
});
