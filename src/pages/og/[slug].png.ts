import type { APIRoute } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getCollection } from 'astro:content'; // @feature:blog
import { siteConfig, ogImageSize } from '@/config/site.config';
import { useTranslations } from '@/i18n/utils';
import { hashParts, openCache, sourceVersion } from '@/lib/build-cache';

// OG görseli TR içerikten üretildiği için başlık/altyazı TR sözlüğünden çekiliyor.
const t = useTranslations('tr');

// Fontlar repo içinde (src/assets/og): ağ erişimi gerekmez ve marka fontu kullanılır. Statik
// örnekler variable fonttan `fonttools varLib.instancer` ile üretildi; satori variable font
// okuyamaz. Bricolage ve Instrument latin-ext taşır, Türkçe glifler tek dosyada.
const FONT_FILES = ['src/assets/og/Bricolage-Bold-Display.ttf', 'src/assets/og/InstrumentSans-Medium.ttf'];

let fontData: Buffer[] | null = null;
function loadFonts(): Buffer[] {
  fontData ??= FONT_FILES.map((f) => readFileSync(resolve(process.cwd(), f)));
  return fontData;
}

// Koina işareti: 3×3 ızgarada K. Sol sütun yosun (katılımcı), kollar polen (usta).
const MARK = ['m', '', 'p', 'm', 'p', '', 'm', '', 'p'];
const markCells = MARK.map((c) => ({
  type: 'div',
  props: {
    style: { width: 26, height: 26, borderRadius: 6, background: c === 'm' ? '#2F7A55' : c === 'p' ? '#F2B33D' : '#D5DFD8' },
  },
}));

export async function getStaticPaths() {
  /* @feature:blog */
  // Filtre yok: yalnızca `data.locale === 'tr'` süzülürse İngilizce yazıların OG görseli hiç
  // üretilmez (ölçüldü: 4 yazı → 2 görsel, build yine de yeşil kalırdı).
  const posts = await getCollection('blog');
  /* @/feature:blog */
  return [
    { params: { slug: 'home' }, props: { title: t('site.title'), subtitle: t('site.description') } },
    /* @feature:blog */
    // `post.id` klasör + dosya adıdır (`tr/hosgeldiniz`); `/` `-`'ye çevrilir çünkü bu tek
    // segmentli bir route (`[slug].png.ts`), içinde literal `/` taşıyamaz. Dil klasörü
    // korunduğu için iki dilde aynı slug'ı taşıyan iki yazı yine de ÇAKIŞMAZ.
    ...posts.map((post) => ({
      params: { slug: `blog-${post.id.replaceAll('/', '-')}` },
      props: { title: post.data.title, subtitle: post.data.description },
    })),
    /* @/feature:blog */
  ];
}

// Uzun başlıklar 630px tuvali taşırıp altyazıyı kadraj dışına itebilir. Satori'nin line-clamp
// desteğine bel bağlamak yerine metni deterministik olarak kırpıyoruz.
function clamp(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// Render PNG'si yalnızca (şablon kodu, font, boyut, site adı, başlık, altyazı)nın saf fonksiyonu;
// build hook'u sürekli koşarken değişmeyen yazının görseli yeniden çizilmez. Şablon dosyasının
// içeriği anahtarda olduğu için tasarım değişince tüm görseller kendiliğinden yenilenir.
const ogCache = openCache('og');

export const GET: APIRoute = async ({ props }) => {
  const { title, subtitle } = props as { title: string; subtitle: string };
  const cacheKey = hashParts(
    sourceVersion(process.cwd(), 'src/pages/og/[slug].png.ts'),
    JSON.stringify([FONT_FILES, ogImageSize, siteConfig.name, title, subtitle]),
  );
  const cached = ogCache.get(cacheKey);
  if (cached) return new Response(new Uint8Array(cached), { headers: { 'Content-Type': 'image/png' } });

  const [display, body] = loadFonts();
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#F2F5F1',
          color: '#173229',
          fontFamily: 'Instrument',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'center', gap: 22 },
              children: [
                { type: 'div', props: { style: { display: 'flex', flexWrap: 'wrap', width: 90, gap: 6 }, children: markCells } },
                { type: 'div', props: { style: { fontFamily: 'Bricolage', fontSize: 52, letterSpacing: -2 }, children: siteConfig.name.toLowerCase() } },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column' },
              children: [
                { type: 'div', props: { style: { fontFamily: 'Bricolage', fontSize: 66, lineHeight: 1.04, letterSpacing: -2.2 }, children: clamp(title, 80) } },
                { type: 'div', props: { style: { fontSize: 28, lineHeight: 1.35, marginTop: 24, color: 'rgba(23,50,41,0.75)' }, children: clamp(subtitle, 130) } },
              ],
            },
          },
        ],
      },
    },
    {
      // Ölçü `ogImageSize`tan: aynı değer `og:image:width/height` olarak da yazılıyor.
      width: ogImageSize.width,
      height: ogImageSize.height,
      // fontFamily değerleriyle birebir eşleşmeli.
      fonts: [
        { name: 'Bricolage', data: display, weight: 700 as const, style: 'normal' as const },
        { name: 'Instrument', data: body, weight: 500 as const, style: 'normal' as const },
      ],
    },
  );
  const png = new Resvg(svg).render().asPng();
  ogCache.put(cacheKey, png);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
