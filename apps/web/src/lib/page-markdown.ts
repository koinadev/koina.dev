/**
 * Sayfa Markdown aynası — render edilmiş bir sayfayı ajanların okuyabileceği düz markdown'a
 * çeviren saf dönüştürücü. Tetikleyicisi `src/integrations/page-markdown.ts`.
 *
 * NEDEN VAR: `llms.txt` sitenin ÖZETİdir; tek tek sayfaların gövdesini taşımaz. Bir cevap motoru
 * ya da ajan sayfayı gerçekten okumak istediğinde bugün render edilmiş HTML'i ayrıştırmak zorunda
 * — script, stil, gezinme ve alt bilgi gürültüsüyle birlikte. `.md` ikizi bu işi BİZİM tarafımızda,
 * build zamanında, bir kez yapar.
 *
 * NEDEN ÇIKTIDAN, KAYNAKTAN DEĞİL: girdi gerçekten yayına çıkan HTML. Sayfa başına elle yazılmış
 * bir markdown ilk şablon değişikliğinde sessizce ayrışırdı; burada ayrışma yapısal olarak mümkün
 * değil. (Blog YAZILARI istisna: onların kaynağı zaten markdown, geri çevirmenin anlamı yok.)
 *
 * NEDEN KENDİ DÖNÜŞTÜRÜCÜMÜZ: hazır bir HTML→Markdown paketi (turndown vb.) gövdeyi çevirir ama
 * NE'yi çevireceğine karar vermez — asıl iş orada. Bu depolarda `<main>` her sitede aynı şeyi
 * kapsamıyor (edumoodup ve furkancolak site başlığını/alt bilgisini `<main>` İÇİNDE render
 * ediyor), yani ayıklama kuralları zaten elle yazılacaktı. Ayrıştırıcı olarak her depoda hazır
 * olan `happy-dom` (finbula'da `linkedom`) yetiyor; yeni bir bağımlılığın karşılığı yok.
 */

/** Dönüştürücünün ihtiyaç duyduğu asgari DOM yüzeyi — happy-dom ve linkedom ikisi de karşılar. */
type DomNode = {
  nodeType: number;
  nodeName: string;
  textContent: string | null;
  childNodes: ArrayLike<DomNode>;
};

type DomElement = DomNode & {
  tagName: string;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  querySelector(selector: string): DomElement | null;
  querySelectorAll(selector: string): ArrayLike<DomElement>;
};

export type DomDocument = {
  querySelector(selector: string): DomElement | null;
  querySelectorAll(selector: string): ArrayLike<DomElement>;
};

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

export interface PageMeta {
  /** Sayfanın kanonik adresi — `<link rel="canonical">`ten okunur, elle kurulmaz. */
  url: string;
  title: string;
  description: string;
  /** `<html lang>` — sayfada ne yazıyorsa o (`tr-TR`, `tr`). */
  locale: string;
  /** Yayım tarihi: `article:published_time` ya da yazının frontmatter'ı. */
  published?: string;
  /**
   * SON DEĞİŞİKLİK. Yayım tarihine DÜŞÜLMÜYOR: tazelik sinyali olarak okunur ve yayım tarihiyle
   * doldurulsaydı hiç güncellenmemiş her sayfa "az önce güncellendi" derdi. Site bilmiyorsa alan
   * hiç yazılmaz.
   */
  modified?: string;
}

/**
 * Gövdeye HİÇ girmeyen etiketler.
 *
 * `nav` ve `footer` KOŞULSUZ eleniyor: ikisi de tanım gereği yönlendirme/künye yüzeyi ve bu
 * depolarda ikisi de her sayfada aynı metni tekrarlıyor — bırakılsalardı üretilen her `.md` aynı
 * kırk satırla başlayıp aynı otuz satırla biterdi ve asıl içerik gürültüde kaybolurdu.
 *
 * `header` LİSTEDE YOK: furkancolak'ın ana sayfasında `<header>` h1'i taşıyan kahraman bölümüdür.
 * Site başlığı ayrı bir kuralla eleniyor — içinde `nav` taşıyanlar (bkz. `isDropped`).
 *
 * `button` DA LİSTEDE YOK; bir kez eklenip GERİ ALINDI: edumoodup'ın SSS sayfasında sorunun
 * KENDİSİ `<h3><button>Soru?</button></h3>` içinde duruyor ve butonu elemek sayfanın sorularını
 * silmişti. Metin taşımayan butonlar (tema anahtarı, menü) zaten site başlığıyla gidiyor.
 */
const DROPPED_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'template',
  'svg',
  'canvas',
  'iframe',
  'object',
  'embed',
  'video',
  'audio',
  'map',
  'nav',
  'footer',
  'dialog',
  'input',
  'select',
  'textarea',
  'option',
]);

/** Satır içi anlam taşıyan etiketler: kendi bloklarını açmaz, çevreleyen paragrafa akar. */
const INLINE_TAGS = new Set([
  'a',
  'abbr',
  'b',
  'bdi',
  'bdo',
  'br',
  'cite',
  'code',
  'data',
  'del',
  'dfn',
  'em',
  'i',
  'img',
  'ins',
  'kbd',
  'mark',
  'q',
  's',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'u',
  'var',
  'wbr',
]);

/**
 * Markdown'da AYRAÇ üreten satır içi etiketler (`**`, `*`, `` ` ``, `[…](…)`).
 *
 * Yalnızca bunlardan sonra otomatik boşluk konur: kaynakta `<strong>%73</strong>Kurum` gibi
 * boşluksuz bitişiklikler var ve ayraç doğrudan harfe yapıştığında hem okunmaz hem de bazı
 * ayrıştırıcılarda vurgu kapanmaz. `<span>`/`<time>` gibi ÇIPLAK metin basan etiketler listede
 * YOK — orada araya boşluk sokmak kaynakta bitişik yazılmış bir sözcüğü ikiye bölerdi.
 */
const DELIMITED_INLINE_TAGS = new Set([
  'a',
  'img',
  'strong',
  'b',
  'em',
  'i',
  'dfn',
  'cite',
  'del',
  's',
  'code',
  'kbd',
  'samp',
]);

const HIDDEN_CLASS = /(^|\s)(sr-only|visually-hidden|screen-reader-only)(\s|$)/;

/**
 * Araya boşluk KONMAYAN devamlar: noktalama ve ek. Türkçede kesme işaretli ekler (`'in`, `'ye`)
 * doğrudan bir `<strong>`/`<span>`in ardından gelebiliyor; oraya boşluk sokmak sözcüğü bozardı.
 * Bunun dışındaki her devam (harf, rakam, simge, yeni bir bağlantı) ayrı bir parçadır.
 */
const NO_SEPARATOR = /^[\s,.;:!?)\]}»”’'…%\-–—/]/u;

/**
 * BAŞLIK MI, BAŞLIK GİBİ DİZİLMİŞ PARAGRAF MI?
 *
 * Bu sitelerin bir kısmında `<h1>`/`<h2>` birkaç cümlelik tanıtım metnini taşıyor (nafru'nun
 * hakkımızda sayfası böyle) — HTML'de doğru, markdown'da yanlış: `# ` satırı okuyan tarafta
 * "sayfanın adı" diye alınır ve iki cümlelik bir başlık o beklentiyi kırar. Böyle metinler
 * paragrafa indiriliyor; sayfanın GERÇEK adı zaten frontmatter `title` alanında duruyor.
 *
 * Eşikler ölçülerek seçildi: bu yedi sitedeki gerçek başlıkların tamamı 90 karakterin altında,
 * tanıtım metinleri ise 200'ün üstünde. Aradaki bant için cümle sayısı karar veriyor.
 */
const SHORT_HEADING_LENGTH = 90;
const LONG_HEADING_LENGTH = 200;
const SENTENCE_END = /[.!?…](\s|$)/g;

function isHeadingLike(text: string): boolean {
  if (text.length <= SHORT_HEADING_LENGTH) return true;
  if (text.length > LONG_HEADING_LENGTH) return false;
  return (text.match(SENTENCE_END)?.length ?? 0) < 2;
}

function tag(node: DomElement): string {
  return node.tagName.toLowerCase();
}

function isElement(node: DomNode): node is DomElement {
  return node.nodeType === ELEMENT_NODE;
}

/**
 * Görünmeyeni ele.
 *
 * `aria-hidden` ve `sr-only` KARŞIT yönlerde çalışır ama ikisi de aynı sebeple eleniyor: biri
 * ekran okuyucudan gizlenmiş süs (ikon, ayraç), diğeri yalnızca ekran okuyucu için yazılmış
 * telafi metni ("yeni sekmede açılır"). İkisi de sayfanın okunur metni DEĞİL.
 *
 * `hidden` ÖZNİTELİĞİ BİLEREK ELENMİYOR: bu sitelerde `hidden` "bu içerik yok" demiyor,
 * "kullanıcı henüz açmadı" diyor — akordeon panelleri, sekme içerikleri. edumoodup'ın SSS
 * sayfasında CEVAPLARIN tamamı `hidden` panellerde duruyor ve elenince sayfa üç başlıktan ibaret
 * kalmıştı. Cevap motorunun aradığı metin tam olarak o.
 */
function isHidden(node: DomElement): boolean {
  if (node.getAttribute('aria-hidden') === 'true') return true;
  if (node.hasAttribute('data-consent-banner')) return true;
  const role = node.getAttribute('role');
  if (role === 'navigation' || role === 'banner' || role === 'contentinfo') return true;
  const className = node.getAttribute('class');
  return className ? HIDDEN_CLASS.test(className) : false;
}

function isDropped(node: DomElement): boolean {
  const name = tag(node);
  if (DROPPED_TAGS.has(name)) return true;
  // Site başlığı: içinde gezinme taşıyan `<header>`. Sayfa/bölüm başlıkları (`<header>` +
  // yalnızca h1/p) bu kurala TAKILMAZ ve içerik olarak kalır — ayrımı yapan tek işaret bu.
  if (name === 'header' && node.querySelector('nav')) return true;
  return isHidden(node);
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ');
}

/** Paragraf başında markdown blok sözdizimine benzeyen metni kaçırır (liste/başlık sanılmasın). */
function escapeBlockStart(text: string): string {
  return text.replace(/^(\s*)([#>]|[-+*](?=\s)|\d+\.(?=\s))/, '$1\\$2');
}

function absolute(href: string, base: string): string | null {
  const value = href.trim();
  if (!value || value.startsWith('#')) return null;
  if (/^javascript:/i.test(value)) return null;
  try {
    return new URL(value, base).href;
  } catch {
    return null;
  }
}

interface Context {
  base: string;
  /**
   * Başlık satırında vurgu işaretçisi BASILMAZ. Kaynakta başlığın yarısı `<strong>` ile yazılmış
   * olabiliyor (furkancolak ana sayfası böyle); `# **Merhaba** …` hem çirkin hem de başlık metnini
   * arayan bir eşleşmeyi bozar. Anlam başlığın kendisinde zaten var.
   */
  plainEmphasis?: boolean;
}

function appendInline(buffer: string, addition: string, previousWasSegment: boolean): string {
  if (!addition) return buffer;
  if (previousWasSegment && buffer && !/\s$/.test(buffer) && !NO_SEPARATOR.test(addition)) {
    return `${buffer} ${addition}`;
  }
  return buffer + addition;
}

/**
 * Kapsayıcının KENDİ metni var mı? Yoksa satır içi çocukları ayrı parçalardır (rozet dizisi,
 * ikon+etiket çifti, sekme başlığı) ve aralarına boşluk gerekir; varsa bitişiklik yazarın
 * kurduğu cümlenin parçasıdır ve dokunulmaz.
 */
function hasOwnText(node: DomElement): boolean {
  const children = node.childNodes;
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (child.nodeType === TEXT_NODE && (child.textContent ?? '').trim()) return true;
  }
  return false;
}

function inlineOf(node: DomElement, context: Context): string {
  let out = '';
  let previousWasSegment = false;
  const ownText = hasOwnText(node);
  const children = node.childNodes;
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    const rendered = renderInline(child, context);
    out = appendInline(out, rendered, previousWasSegment);
    if (!rendered) continue;
    previousWasSegment =
      isElement(child) && (!ownText || (!context.plainEmphasis && DELIMITED_INLINE_TAGS.has(tag(child))));
  }
  return out;
}

/**
 * Bağlantı ve vurgu ETİKETİ tek satır olmak zorundadır: içerideki `<br>` markdown'da satır sonuna
 * dönüşürse `[…](…)` sözdizimi ortasından kırılır ve bağlantı düz metne düşer.
 */
function label(node: DomElement, context: Context): string {
  return inlineOf(node, context)
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}

/**
 * Bağlantının ADI, süsü değil.
 *
 * Kaynakta bağlantı etiketinin önünde ayrı bir `<span>` içinde dekoratif rozet durabiliyor
 * (nafru: `<a><span>'17</span><span>TÜM NAFRU PROJELERİNİ İNCELE</span></a>`). Rozet etikete
 * karışınca `['17 TÜM NAFRU …](…)` çıkıyor ve bağlantının nereye gittiğini okuyan taraf için
 * bulanıklaştırıyor. Bağlantının kendi metni yoksa parçalara bakılıyor ve BAŞTAKİ harfsiz
 * parçalar (sayaç, yıl, ikon) atılıyor. Geriye harfli bir parça kalmıyorsa hiçbir şey atılmaz —
 * adı gerçekten "2026" olan bir bağlantı adsız kalmamalı.
 */
function linkLabel(node: DomElement, context: Context): string {
  const whole = label(node, context);
  if (hasOwnText(node)) return whole;

  const segments: string[] = [];
  const children = node.childNodes;
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (!isElement(child) || isDropped(child)) continue;
    const piece = renderInline(child, context)
      .replace(/\s*\n\s*/g, ' ')
      .trim();
    if (piece) segments.push(piece);
  }
  if (segments.length < 2) return whole;
  while (segments.length > 1 && !/\p{L}/u.test(segments[0])) segments.shift();
  return segments.join(' ');
}

function renderInline(node: DomNode, context: Context): string {
  if (node.nodeType === TEXT_NODE) return collapse(node.textContent ?? '');
  if (!isElement(node)) return '';
  if (isDropped(node)) return '';

  const name = tag(node);
  switch (name) {
    case 'br':
      return '\n';
    case 'wbr':
      return '';
    case 'img': {
      const source = absolute(node.getAttribute('src') ?? '', context.base);
      const alt = collapse(node.getAttribute('alt') ?? '').trim();
      // `alt=""` HTML'de "bu görsel dekoratiftir" demektir; metin akışına hiç girmemeli.
      if (!source || !alt) return '';
      return `![${alt}](${source})`;
    }
    case 'a': {
      const text = linkLabel(node, context);
      if (!text) return '';
      const href = absolute(node.getAttribute('href') ?? '', context.base);
      // Adres yoksa (çapa, `#`) bağlantı değil düz metindir — boş bir `[]()` üretmenin anlamı yok.
      return href ? `[${text}](${href})` : text;
    }
    case 'strong':
    case 'b': {
      const text = label(node, context);
      if (!text) return '';
      return context.plainEmphasis ? text : `**${text}**`;
    }
    case 'em':
    case 'i':
    case 'dfn':
    case 'cite': {
      const text = label(node, context);
      if (!text) return '';
      return context.plainEmphasis ? text : `*${text}*`;
    }
    case 'del':
    case 's': {
      const text = label(node, context);
      if (!text) return '';
      return context.plainEmphasis ? text : `~~${text}~~`;
    }
    case 'code':
    case 'kbd':
    case 'samp': {
      const text = collapse(node.textContent ?? '').trim();
      if (!text) return '';
      return context.plainEmphasis ? text : `\`${text}\``;
    }
    default:
      return inlineOf(node, context);
  }
}

function tidyParagraph(text: string): string {
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function oneLine(node: DomElement, context: Context): string {
  return tidyParagraph(inlineOf(node, context)).replace(/\n+/g, ' ');
}

function listBlock(node: DomElement, context: Context): string[] {
  const ordered = tag(node) === 'ol';
  const start = Number.parseInt(node.getAttribute('start') ?? '1', 10);
  const lines: string[] = [];
  let counter = Number.isFinite(start) ? start : 1;

  const children = node.childNodes;
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (!isElement(child) || tag(child) !== 'li' || isDropped(child)) continue;
    const marker = ordered ? `${counter}. ` : '- ';
    counter += 1;
    const body = blocksOf(child, context).join('\n\n').trim();
    if (!body) continue;
    const indent = ' '.repeat(marker.length);
    const [first, ...rest] = body.split('\n');
    lines.push(marker + first);
    for (const line of rest) lines.push(line ? indent + line : '');
  }
  return lines.length > 0 ? [lines.join('\n')] : [];
}

function tableBlock(node: DomElement, context: Context): string[] {
  const rows = Array.from(node.querySelectorAll('tr'));
  if (rows.length === 0) return [];

  const cell = (element: DomElement) =>
    inlineOf(element, context).replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
  const matrix = rows
    .map((row) => Array.from(row.querySelectorAll('th, td')).map(cell))
    .filter((cells) => cells.length > 0);
  if (matrix.length === 0) return [];

  const width = Math.max(...matrix.map((cells) => cells.length));
  const pad = (cells: string[]) => {
    const filled = [...cells];
    while (filled.length < width) filled.push('');
    return `| ${filled.join(' | ')} |`;
  };

  const [head, ...body] = matrix;
  const divider = `| ${Array.from({ length: width }, () => '---').join(' | ')} |`;
  return [[pad(head), divider, ...body.map(pad)].join('\n')];
}

function codeBlock(node: DomElement): string[] {
  const code = (node.textContent ?? '').replace(/\n+$/, '');
  if (!code.trim()) return [];
  const inner = node.querySelector('code');
  const language = /language-([\w-]+)/.exec(inner?.getAttribute('class') ?? '')?.[1] ?? '';
  return [`\`\`\`${language}\n${code}\n\`\`\``];
}

function blockElement(node: DomElement, context: Context): string[] {
  const name = tag(node);

  if (/^h[1-6]$/.test(name)) {
    const text = oneLine(node, { ...context, plainEmphasis: true });
    if (!text) return [];
    return isHeadingLike(text) ? [`${'#'.repeat(Number(name[1]))} ${text}`] : [escapeBlockStart(text)];
  }

  switch (name) {
    case 'p': {
      const text = tidyParagraph(inlineOf(node, context));
      return text ? [escapeBlockStart(text)] : [];
    }
    case 'ul':
    case 'ol':
      return listBlock(node, context);
    case 'blockquote':
      return blocksOf(node, context).map((block) =>
        block
          .split('\n')
          .map((line) => (line ? `> ${line}` : '>'))
          .join('\n'),
      );
    case 'pre':
      return codeBlock(node);
    case 'table':
      return tableBlock(node, context);
    case 'hr':
      return ['---'];
    case 'dl': {
      const lines: string[] = [];
      const children = node.childNodes;
      for (let index = 0; index < children.length; index += 1) {
        const child = children[index];
        if (!isElement(child) || isDropped(child)) continue;
        const text = oneLine(child, context);
        if (!text) continue;
        if (tag(child) === 'dt') lines.push(`- **${text}**`);
        else if (tag(child) === 'dd') lines.push(`  ${text}`);
      }
      return lines.length > 0 ? [lines.join('\n')] : [];
    }
    case 'figcaption': {
      const text = oneLine(node, context);
      return text ? [`*${text}*`] : [];
    }
    case 'summary': {
      const text = oneLine(node, context);
      return text ? [`**${text}**`] : [];
    }
    default:
      return blocksOf(node, context);
  }
}

function blocksOf(node: DomElement, context: Context): string[] {
  const out: string[] = [];
  let buffer = '';
  let previousWasSegment = false;
  const ownText = hasOwnText(node);

  const flush = () => {
    const text = tidyParagraph(buffer);
    if (text) out.push(escapeBlockStart(text));
    buffer = '';
    previousWasSegment = false;
  };

  const children = node.childNodes;
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (child.nodeType === TEXT_NODE) {
      const text = collapse(child.textContent ?? '');
      buffer = appendInline(buffer, text, previousWasSegment);
      if (text) previousWasSegment = false;
      continue;
    }
    if (!isElement(child)) continue;
    if (isDropped(child)) continue;
    if (INLINE_TAGS.has(tag(child))) {
      const rendered = renderInline(child, context);
      buffer = appendInline(buffer, rendered, previousWasSegment);
      if (rendered) previousWasSegment = !ownText || DELIMITED_INLINE_TAGS.has(tag(child));
      continue;
    }
    flush();
    out.push(...blockElement(child, context));
  }
  flush();
  return out;
}

/**
 * İçerik bölgesi: `<main>`.
 *
 * `<main>` HER sitede var ve sayfada TEK. Ama kapsadığı şey aynı değil — edumoodup ve furkancolak
 * site başlığını ve alt bilgisini `<main>` İÇİNDE render ediyor (ölçüldü: o sayfalarda
 * `main.textContent` ≈ `body.textContent`). Bu yüzden `<main>` yalnızca başlangıç noktası; asıl
 * ayıklamayı yukarıdaki eleme kuralları yapıyor.
 */
export function contentRoot(document: DomDocument): DomElement | null {
  return document.querySelector('main') ?? document.querySelector('body');
}

export function htmlToMarkdown(root: DomElement, base: string): string {
  return blocksOf(root, { base })
    .map((block) => block.trim())
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n');
}

function metaContent(document: DomDocument, attribute: string, key: string): string {
  return document.querySelector(`meta[${attribute}="${key}"]`)?.getAttribute('content')?.trim() ?? '';
}

/** `noindex` sayfalar (404, kök dil yönlendirme stub'ı) markdown ikizi ALMAZ. */
export function isIndexable(document: DomDocument): boolean {
  if (metaContent(document, 'name', 'robots').toLowerCase().includes('noindex')) return false;
  return Boolean(document.querySelector('link[rel="canonical"]'));
}

export function extractMeta(document: DomDocument): PageMeta | null {
  const url = document.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim();
  if (!url) return null;
  return {
    url,
    title: collapse(document.querySelector('title')?.textContent ?? '').trim(),
    description: metaContent(document, 'name', 'description'),
    locale: document.querySelector('html')?.getAttribute('lang')?.trim() ?? '',
    published: metaContent(document, 'property', 'article:published_time') || undefined,
    modified: metaContent(document, 'property', 'article:modified_time') || undefined,
  };
}

function yamlString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Başlık bloğu YAML frontmatter olarak yazılıyor: markdown okuyan her araç bu biçimi zaten tanıyor
 * ve gövdeyi kirletmeden makine tarafından okunabilir alanlar taşıyor.
 */
export function renderMarkdownDocument(meta: PageMeta, body: string): string {
  const lines = ['---', `url: ${yamlString(meta.url)}`];
  if (meta.title) lines.push(`title: ${yamlString(meta.title)}`);
  if (meta.description) lines.push(`description: ${yamlString(meta.description)}`);
  if (meta.locale) lines.push(`locale: ${yamlString(meta.locale)}`);
  if (meta.published) lines.push(`published: ${yamlString(meta.published)}`);
  if (meta.modified) lines.push(`modified: ${yamlString(meta.modified)}`);
  lines.push('---', '');

  // Gövdede H1 yoksa sayfanın adı başa konur: sözleşme "her `.md` bir H1 ile başlar" diyor ve
  // başlığı paragrafa inen sayfalarda (bkz. `isHeadingLike`) tek doğru ad `title`dır.
  const heading = /^# /m.test(body) ? '' : `# ${meta.title}\n\n`;
  return `${lines.join('\n')}${heading}${body}\n`;
}

/**
 * Çıktı yolu → markdown yolu.
 *
 * KURAL: sayfanın SERVİS EDİLEN yolunun sonuna `.md`. `dist/tr/hakkinda.html` (`build.format:
 * 'file'`) → `dist/tr/hakkinda.md`; `dist/about/index.html` (`format: 'directory'`) →
 * `dist/about.md`. İkinci durumda `dist/about/index.md` de yazılabilirdi ama o `/about/index.md`
 * adresini üretirdi — ajan tarafındaki yerleşik sözleşme "sayfanın adresine `.md` ekle", araya
 * dizin adı sokmak değil. Kök sayfa tek istisna: `/` + `.md` bir adres olmadığı için `/index.md`.
 */
export function markdownPathFor(htmlRelativePath: string): string {
  const normalized = htmlRelativePath.split('\\').join('/');
  if (normalized === 'index.html') return 'index.md';
  if (normalized.endsWith('/index.html')) return `${normalized.slice(0, -'/index.html'.length)}.md`;
  return `${normalized.slice(0, -'.html'.length)}.md`;
}

/** Frontmatter'ı gövdeden ayırır. Alanlar düz skaler; liste/iç içe yapı bu depolarda yok. */
/** YAML çift tırnaklı skalerinde tanınan kaçışlar. Listede olmayan `\\x` kendi karakterine düşer. */
const YAML_ESCAPES: Record<string, string> = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f' };

export function parseFrontMatter(raw: string): { data: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!field) continue;
    let value = field[2].trim();
    // Tırnaklar KIRPILMAKLA KALMAZ, kaçışlar da çözülür. YAML'ın çift tırnaklı skalerinde `\"`
    // bir tırnak KARAKTERİDİR; yalnızca dış tırnakları kırpmak ters bölüyü metinde bırakır ve
    // başlığında tırnak geçen bir yazı `# Siteniz \"az kaldı\" değil` diye yayımlanırdı.
    if (value.length > 1 && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\(["\\/bfnrt])/g, (_, code) => YAML_ESCAPES[code] ?? code);
    } else if (value.length > 1 && value.startsWith("'") && value.endsWith("'")) {
      // Tek tırnaklı skalerde kaçış YOKTUR; tırnağın kendisi `''` diye ikilenir.
      value = value.slice(1, -1).replace(/''/g, "'");
    }
    data[field[1]] = value;
  }
  return { data, body: raw.slice(match[0].length) };
}

/**
 * Blog yazısının markdown KAYNAĞINDAN gövde üretir.
 *
 * NEDEN kaynaktan: yazının kendisi zaten markdown. Render edilmiş HTML'den geri çevirmek aynı
 * metni bir tur kaybettirir (tipografik değiştirmeler, `<p>` sarmalayıcıları, otomatik id'ler).
 * Kaynak bulunamazsa (uzak uçtan gelen yazılar) HTML yoluna düşülür — sessiz bir boşluk kalmaz.
 *
 * Göreli adresler MUTLAKA mutlaklaştırılır: `.md` dosyası sayfadan BAŞKA bir adreste servis
 * ediliyor (`/blog/x` → `/blog/x.md`), göreli bağlantılar orada farklı bir yere çözülürdü.
 */
export function markdownBodyFromSource(body: string, meta: PageMeta): string {
  return body
    .replace(/(!?\[[^\]]*\]\()([^)\s]+)(\s*(?:"[^"]*")?\))/g, (match, open, target, close) => {
      if (/^(https?:|mailto:|tel:|#)/i.test(target)) return match;
      return `${open}${absolute(target, meta.url) ?? target}${close}`;
    })
    .trim();
}
