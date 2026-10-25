// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import pageMarkdown from './src/integrations/page-markdown';
import buildCache from './src/integrations/build-cache';

// Tek doğruluk kaynağı wrangler.toml `vars` PUBLIC_SITE_URL; prebuild bunu `.env`'e yazar
// (Astro config Node'da çalışır, `import.meta.env` burada yok).
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

export default defineConfig({
  site: env.PUBLIC_SITE_URL,
  output: 'static',
  // `defaultStrategy: 'viewport'`: nav linkleri ilk ekranda göründüğü için hover yerine
  // görünür olunca önceden çekilir (yavaş bağlantıda/offline kendiliğinden devre dışı kalır).
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  /* @feature:i18n */
  i18n: {
    defaultLocale: 'tr',
    locales: ['tr', 'en'],
    // Kökü (`/`) biz sahipleniyoruz (dil algılayan yönlendirme sayfası); Astro'nun kendi
    // yönlendirmesi açık olsaydı ziyaretçi tarayıcı dilinden bağımsız hep `/tr/`ye giderdi.
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  /* @/feature:i18n */
  integrations: [
    sitemap({
      /* @feature:i18n */
      // Yalnızca ön ek soyulduktan sonra yolu aynı olan sayfaları eşler (`/tr/` ↔ `/en/`);
      // lokalize slug'lar eşleşmez, onların hreflang'i sayfa `<head>`'inden gelir.
      i18n: { defaultLocale: 'tr', locales: { tr: 'tr-TR', en: 'en-US' } },
      // Kök `/` dil algılayan noindex yönlendirme stub'ı; i18n çıkarılırsa gerçek ana sayfa olur.
      filter: (page) => new URL(page).pathname !== '/',
      /* @/feature:i18n */
    }),
    // Her sayfanın yanına `.md` ikizi yazar (cevap motorları HTML ayrıştırmak zorunda
    // kalmasın). Entegrasyon, `postbuild` script'i DEĞİL: build hangi yoldan çağrılırsa
    // çağrılsın çalışır. Bkz. `src/integrations/page-markdown.ts`.
    pageMarkdown(),
    // Önbellek çöp toplama + rapor. `pageMarkdown()`dan SONRA olmalı (bkz. dosya başlığı).
    buildCache(),
  ],
  // Görsel optimizasyonu TAMAMEN BUILD ZAMANINDA olur: `output: 'static'` altında Astro uzak
  // görselleri de indirip dönüştürür ve statik dosya olarak yazar (astro/dist/assets/build/
  // generate.js — `loadRemoteImage` + disk cache). Çalışma zamanında `/_image` endpoint'i YOKTUR.
  image: {
    // Uzak görsellerin (CMS/DAM) build sırasında optimize edilebilmesi için yetkilendirme şart:
    // liste boşken Astro hiçbir uzak görseli işlemez ve URL'yi olduğu gibi bırakır. Kaynak host'unuz
    // belliyse `hostname` ekleyerek DARALTIN — burada geniş bırakılmasının sebebi şablonun hangi
    // CMS'e bağlanacağının bilinmemesi.
    remotePatterns: [{ protocol: 'https' }],
    // `<Image />` varsayılan olarak srcset üretsin: doğru boyut servis etmek, tek bir büyük
    // görseli tarayıcıda küçültmekten hem daha kaliteli hem daha küçüktür.
    layout: 'constrained',
    responsiveStyles: true,
    service: {
      entrypoint: 'astro/assets/services/sharp',
      // GÖRSEL OLARAK KAYIPSIZ ayar seti. Asıl görünür bozulma kaynağı renk altörnekleme
      // (`4:2:0`) — keskin kenarlarda ve metin içeren görsellerde renk saçaklanması yapar;
      // `4:4:4` ile kapatıldı. Gerçek `lossless: true` dosyayı 5-10× şişirdiği için tercih
      // EDİLMEDİ; kaynak dosyanın kendisi zaten `content/` altında git'te duruyor.
      config: {
        avif: { quality: 82, effort: 6, chromaSubsampling: '4:4:4' },
        webp: { quality: 88, effort: 6 },
        jpeg: { quality: 88, mozjpeg: true, progressive: true, chromaSubsampling: '4:4:4' },
        // PNG zaten kayıpsız; burada yalnızca sıkıştırma eforu artırılıyor (kalite etkilenmez).
        png: { compressionLevel: 9, effort: 8 },
      },
    },
  },
  vite: { plugins: [tailwindcss()] },
});
