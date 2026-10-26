// Tüm değerler wrangler.toml `[vars]` üzerinden PUBLIC_* env olarak gelir.
// `sync-wrangler-env.ts` build öncesi .env üretir; Astro PUBLIC_*'leri import.meta.env'e yazar.
// Runtime sır burada YOK — şablon statik, anahtarlar build zamanı bundle'a gömülür.
const env = import.meta.env;
/* @feature:forms */
const formProvider = (env.PUBLIC_FORMS_PROVIDER || 'custom') as 'custom' | 'formspark' | 'web3forms';
const formEndpoint =
  formProvider === 'web3forms' ? 'https://api.web3forms.com/submit' : (env.PUBLIC_FORMS_ENDPOINT ?? '');
/* @/feature:forms */

export const siteConfig = {
  name: env.PUBLIC_SITE_NAME ?? '',
  url: env.PUBLIC_SITE_URL ?? '',
  logo: env.PUBLIC_SITE_LOGO ?? '/logo.svg',
  contactEmail: env.PUBLIC_CONTACT_EMAIL ?? '',
  // Site AGPL-3.0; footer'daki kaynak kodu linki buraya gider.
  sourceUrl: 'https://github.com/koinadev/koina.dev',
  socials: {
    x: env.PUBLIC_SOCIAL_X ?? '',
    github: env.PUBLIC_SOCIAL_GITHUB ?? '',
    linkedin: env.PUBLIC_SOCIAL_LINKEDIN ?? '',
    instagram: env.PUBLIC_SOCIAL_INSTAGRAM ?? '',
    youtube: env.PUBLIC_SOCIAL_YOUTUBE ?? '',
    discord: env.PUBLIC_SOCIAL_DISCORD ?? '',
  },
  /* @feature:forms */
  turnstileSiteKey: env.PUBLIC_TURNSTILE_SITE_KEY ?? '',
  /* @/feature:forms */
  // Arama motoru MÜLK DOĞRULAMASI. Statik sitede en pratik yöntem meta etiketidir (HTML dosyası
  // yüklemek de mümkün ama `public/` altına elle dosya koymayı gerektirir, deploy'lar arasında
  // unutulur). BOŞKEN etiket hiç render EDİLMEZ: `content=""` taşıyan bir doğrulama etiketi
  // Search Console tarafından "bulundu ama geçersiz" sayılır — sessiz başarısızlık.
  verification: {
    google: env.PUBLIC_SEO_VERIFICATION_GOOGLE ?? '',
    bing: env.PUBLIC_SEO_VERIFICATION_BING ?? '',
  },
  /* @feature:blog */
  blog: {},
  /* @/feature:blog */
  /* @feature:forms */
  forms: {
    provider: formProvider,
    endpoint: formEndpoint,
    accessKey: env.PUBLIC_FORMS_ACCESS_KEY ?? '',
    turnstileAction: env.PUBLIC_TURNSTILE_ACTION || 'contact',
  },
  /* @/feature:forms */
  /* @feature:analytics */
  analytics: {
    // `||`, `??` DEĞİL. `??` yalnızca `undefined`/`null` yakalar; wrangler.toml'deki varsayılan
    // değer BOŞ DİZE olduğu için provider `''` kalıyordu ve `'' !== 'none'` doğru olduğundan
    // analytics script'i hiçbir sağlayıcı yapılandırılmamışken de her sayfaya basılıyordu
    // (ölçüldü: dist/tr/index.html içinde ölü `__analyticsInjected` bloğu).
    provider: (env.PUBLIC_ANALYTICS_PROVIDER || 'none') as 'plausible' | 'ga4' | 'none',
    // Plausible'ın Ekim 2025'te tanıttığı yeni snippet siteye özeldir (`pa-…js`). Panelde
    // Site Installation altında verilen TAM script URL'i buraya gelir; eski `data-domain`
    // snippet'i yeni siteler için doğru kurulum değildir.
    plausibleScriptUrl: env.PUBLIC_ANALYTICS_PLAUSIBLE_SCRIPT_URL ?? '',
    ga4Id: env.PUBLIC_ANALYTICS_GA4_ID ?? '',
  },
  /* @/feature:analytics */
  /* @feature:newsletter */
  newsletter: {
    action: env.PUBLIC_NEWSLETTER_ACTION ?? '',
  },
  /* @/feature:newsletter */
} as const;

/* @feature:forms */
const formProviders = new Set(['custom', 'formspark', 'web3forms']);
if (!formProviders.has(siteConfig.forms.provider)) {
  throw new Error('PUBLIC_FORMS_PROVIDER yalnızca custom, formspark veya web3forms olabilir.');
}
if (siteConfig.forms.provider === 'web3forms' && !siteConfig.forms.accessKey) {
  throw new Error('PUBLIC_FORMS_PROVIDER=web3forms için PUBLIC_FORMS_ACCESS_KEY zorunludur.');
}
/* @/feature:forms */

/* @feature:analytics */
// Sağlayıcı seçilip zorunlu kimlik unutulduğunda banner gösterip hiçbir veri toplamaktansa build'i
// açık bir mesajla durdur. Bu değerlerin ikisi de public kurulum kimliğidir; secret değildir.
if (siteConfig.analytics.provider === 'plausible' && !siteConfig.analytics.plausibleScriptUrl) {
  throw new Error(
    'PUBLIC_ANALYTICS_PROVIDER=plausible için PUBLIC_ANALYTICS_PLAUSIBLE_SCRIPT_URL zorunludur.',
  );
}
if (siteConfig.analytics.provider === 'ga4' && !/^G-[A-Z0-9]+$/i.test(siteConfig.analytics.ga4Id)) {
  throw new Error('PUBLIC_ANALYTICS_PROVIDER=ga4 için geçerli bir PUBLIC_ANALYTICS_GA4_ID (G-…) zorunludur.');
}
/* @/feature:analytics */

/**
 * OG görsel tuvalinin ölçüsü. TEK KAYNAK: `src/pages/og/[slug].png.ts` satori'ye bu boyutu verir,
 * `MetaTags` aynı değeri `og:image:width/height` olarak yazar. İkisi ayrışırsa paylaşım
 * önizlemesi yanlış oranla kırpılır — ve bu yalnızca üçüncü-taraf bir kazıyıcıda görülür,
 * build'de değil.
 */
export const ogImageSize = { width: 1200, height: 630 } as const;

// Blog RSS feed ve `<link rel="alternate">` başlığı — tek yerden, üç dosyada ayrı ayrı yazılmasın.
export const blogFeedTitle = `${siteConfig.name} Blog`;

// JSON-LD Organization'ın çekirdeği. `BaseLayout` bunu `url`/`logo`/`sameAs` ile genişletir; blog
// yazı sayfaları `Article.publisher` için doğrudan kullanır (aynı obje şekli, iki yerde ayrı
// ayrı yazılmasın).
export function organizationJsonLd() {
  const sameAs = Object.values(siteConfig.socials).filter(Boolean);
  return {
    '@type': 'Organization' as const,
    name: siteConfig.name,
    url: siteConfig.url,
    // Vitest `PUBLIC_*` Astro env'lerini enjekte etmez; boş test konfigürasyonunda göreli logo
    // korunur. Gerçek build'de PUBLIC_SITE_URL zorunlu olduğundan her zaman mutlak URL çıkar.
    logo: siteConfig.url ? new URL(siteConfig.logo, siteConfig.url).href : siteConfig.logo,
    ...(sameAs.length ? { sameAs } : { sameAs: [] }),
  };
}
