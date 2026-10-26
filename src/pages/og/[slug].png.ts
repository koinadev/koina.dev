import { markSvg } from '../../lib/mark';
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

// Marka fontu DM Sans, @fontsource/dm-sans paketinin statik WOFF dosyalarından (satori variable
// font ve WOFF2 okuyamaz). Türkçe harfler (ş, ğ, ı, İ) latin-ext dosyasında; satori eksik glifi
// yüklü diğer fontlardan (burada `DM Sans Ext`) alır.
const FONT_DIR = 'node_modules/@fontsource/dm-sans/files';
const FONT_FILES = ['latin-700', 'latin-ext-700', 'latin-500', 'latin-ext-500'].map(
  (f) => `${FONT_DIR}/dm-sans-${f}-normal.woff`,
);

let fontData: Buffer[] | null = null;
function loadFonts(): Buffer[] {
  fontData ??= FONT_FILES.map((f) => readFileSync(resolve(process.cwd(), f)));
  return fontData;
}

// Koina işareti (bkz. src/lib/mark.ts); satori SVG'yi görsel olarak çizer.
const markImage = {
  type: 'img',
  props: {
    src: `data:image/svg+xml;base64,${Buffer.from(markSvg()).toString('base64')}`,
    width: 84,
    height: 84,
  },
};

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

  const [display, displayExt, body, bodyExt] = loadFonts();
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
          background: '#FBFAF7',
          color: '#1B1F3B',
          fontFamily: 'DM Sans',
          fontWeight: 500,
        },
        children: [
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'center', gap: 22 },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', width: 90 },
                    children: [markImage],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { fontFamily: 'DM Sans', fontWeight: 700, fontSize: 52, letterSpacing: -2 },
                    children: siteConfig.name.toLowerCase(),
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontFamily: 'DM Sans',
                      fontWeight: 700,
                      fontSize: 66,
                      lineHeight: 1.04,
                      letterSpacing: -2.2,
                    },
                    children: clamp(title, 80),
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 28, lineHeight: 1.35, marginTop: 24, color: '#50567A' },
                    children: clamp(subtitle, 130),
                  },
                },
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
        { name: 'DM Sans', data: display, weight: 700 as const, style: 'normal' as const },
        { name: 'DM Sans Ext', data: displayExt, weight: 700 as const, style: 'normal' as const },
        { name: 'DM Sans', data: body, weight: 500 as const, style: 'normal' as const },
        { name: 'DM Sans Ext', data: bodyExt, weight: 500 as const, style: 'normal' as const },
      ],
    },
  );
  const png = new Resvg(svg).render().asPng();
  ogCache.put(cacheKey, png);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
