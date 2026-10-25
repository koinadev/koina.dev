# Configuration and content

Bir landing page'i kendinize uyarlarken sırayla dokunacağınız yerler.

| Ne değişiyor                                                  | Dosya                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| Site adı, başlık, URL, sosyal hesaplar, analytics sağlayıcısı | `src/config/site.config.ts`                                         |
| Kanonik alan adı (build zamanı)                               | `astro.config.mjs` → `site`                                         |
| Bölüm içerikleri (uzun metin, listeler, fiyatlar)             | `src/data/<dil>/*.ts`                                               |
| Arayüz metinleri (buton, aria-label, durum mesajı)            | `src/i18n/<dil>.json`                                               |
| Marka renkleri, font, animasyon token'ları                    | `src/styles/global.css` → `@theme`                                  |
| Logo ve favicon                                               | `public/`                                                           |
| Blog yazıları                                                 | `content/blog/<dil>/<slug>/index.md` (+ görselleri yanında)         |
| URL'ler ve slug'lar                                           | `src/i18n/routes.ts` → [routing-and-i18n.md](./routing-and-i18n.md) |

---

## `src/config/site.config.ts`

Tek nesne, alan alan:

```ts
export const siteConfig = {
  name: env.PUBLIC_SITE_NAME ?? '',
  url: env.PUBLIC_SITE_URL ?? '',
  logo: env.PUBLIC_SITE_LOGO ?? '/logo.svg',
  contactEmail: env.PUBLIC_CONTACT_EMAIL ?? '',
  socials: { x: '…', github: '…', linkedin: '…' },
  turnstileSiteKey: env.PUBLIC_TURNSTILE_SITE_KEY ?? '',
  forms: { provider: 'custom', endpoint: '…', accessKey: '', turnstileAction: 'contact' },
  analytics: { … },            /* @feature:analytics */
  newsletter: { action: '' },  /* @feature:newsletter */
};
```

Tüm değerler `wrangler.toml` → `[vars]` altındaki `PUBLIC_*` anahtarlarından gelir
(`sync-wrangler-env.ts` build öncesi `.env`'e yazar) — dosyanın kendisinde sabit değer yoktur.

| Alan                           | Nerede kullanılır                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                         | Header/Footer logosu yanındaki metin, `og:site_name`, `Organization` JSON-LD, OG görselinin üst satırı, RSS başlığı.                                                                                                                                                                                                                                                        |
| `url`                          | `Astro.site` **yoksa** kullanılan yedek mutlak URL tabanı. `astro.config.mjs` → `site` ile aynı olmalı. `Organization` JSON-LD'sinde doğrudan bu alan kullanılır.                                                                                                                                                                                                           |
| `logo`                         | Header/Footer görseli ve JSON-LD `logo` alanı (`url` ile birleştirilerek mutlaklaştırılır).                                                                                                                                                                                                                                                                                 |
| `contactEmail`                 | Gizlilik sayfalarındaki `mailto:` bağlantısı (`src/pages/*/gizlilik.astro`, `privacy.astro`).                                                                                                                                                                                                                                                                               |
| `socials`                      | Footer bağlantıları (anahtar adı etiket olarak gösterilir) ve JSON-LD `sameAs` dizisi. Anahtar ekleyip çıkarmak serbesttir.                                                                                                                                                                                                                                                 |
| `turnstileSiteKey`             | İletişim formundaki açık Turnstile sitekey. Secret bu statik repoya girmez: custom sağlayıcıda form Worker'ına, Formspark/Web3Forms'ta sağlayıcının paneline kaydedilir.                                                                                                                                                                                                    |
| `forms.provider`               | `'custom' \| 'formspark' \| 'web3forms'`. Payload ve başarı yanıtı `contact.service.ts` içinde sağlayıcıya göre normalize edilir.                                                                                                                                                                                                                                           |
| `forms.endpoint`               | Custom için `https://<worker>/v1/forms/<siteId>/<formId>`, Formspark için `https://submit-form.com/<form-id>`. Web3Forms seçildiğinde resmi endpoint otomatik kullanılır.                                                                                                                                                                                                   |
| `forms.accessKey`              | Yalnız Web3Forms public access key'i. DOM'da hidden input olarak tutulmaz; adapter sadece Web3Forms payload'ına ekler.                                                                                                                                                                                                                                                      |
| `forms.turnstileAction`        | Varsayılan `contact`. Custom Worker tenant registry'sindeki `expectedTurnstileAction` ile birebir eşleşmelidir.                                                                                                                                                                                                                                                             |
| `analytics.provider`           | `'plausible' \| 'ga4' \| 'none'`. `'none'` seçilirse hiçbir script enjekte edilmez.                                                                                                                                                                                                                                                                                         |
| `analytics.plausibleScriptUrl` | Plausible Site Installation ekranındaki siteye özel tam `https://plausible.io/js/pa-….js` URL'i. Eski `data-domain` değeri değildir.                                                                                                                                                                                                                                        |
| `analytics.ga4Id`              | GA4 ölçüm kimliği (`G-…`).                                                                                                                                                                                                                                                                                                                                                  |
| `blog.remoteEndpoint`          | Blog yazılarının çekileceği opsiyonel JSON endpoint'i (`PUBLIC_BLOG_REMOTE_ENDPOINT`). **Boş bırakılırsa uzak kod yolu hiç çalışmaz** — tek fetch bile atılmaz; şablonun varsayılanı repo içi markdown'dır. Dolu olduğunda uzak yazılar yerel yazıların **üzerine yazmadan** eklenir; kaynak erişilemezse build uyarı verip yerelle devam eder. Bkz. `src/loaders/blog.ts`. |
| `newsletter.action`            | Bülten formunun `action` URL'i. Boş bırakılırsa form `#`e gider (yani hiçbir şey yapmaz) — sağlayıcınızın endpoint'ini buraya yazın.                                                                                                                                                                                                                                        |

Marker'lı alanlar (`forms`, `analytics`, `newsletter`) ilgili özellik çıkarıldığında dosyadan
**tamamen silinir** — yani o özellikler seçilmeden üretilmiş bir projede yukarıdaki tabloda
görünen bu satırlar `site.config.ts` içinde bulunmaz.

## The `site` field

`astro.config.mjs`:

```js
site: 'https://example.com',
```

Bu alan **kozmetik değildir**. Ondan türeyen şeyler:

- `<link rel="canonical">` (`MetaTags.astro`)
- `hreflang` bağlantıları ve `x-default`
- `og:url`, `og:image` (mutlak URL'e çevrilir)
- `sitemap-index.xml` ve `sitemap-0.xml` içindeki `<loc>` değerleri
- RSS beslemesindeki bağlantılar

Yanlış bırakılırsa build hata **vermez**; site yayına çıkar ve arama motorlarına
`example.com` adresini gösterir.

Değiştirirken tek doğruluk kaynağını güncelleyin:

1. `wrangler.toml` → `PUBLIC_SITE_URL`
2. `bun run build`
3. `dist/robots.txt`, `dist/sitemap-index.xml` ve bir sayfadaki canonical URL'nin aynı host'u
   kullandığını doğrulayın.

`src/pages/robots.txt.ts`, `astro.config.mjs` ve `siteConfig.url` bu değerden build sırasında
üretilir. `public/robots.txt` yoktur ve yeniden eklenmemelidir; `public/` dosyaları şablonlanmadan
kopyalandığı için oradaki sabit bir sitemap URL'si yeni projelerde yanlış kalır.

## Content: `src/data/`

```
src/data/
  index.ts        getData(locale)
  tr/index.ts     re-export listesi
  tr/hero.ts, features.ts, stats.ts, faq.ts, cta.ts, about.ts,
     logos.ts, nav.ts, privacy.ts,
     pricing.ts, testimonials.ts, team.ts, case-studies.ts,
     newsletter.ts, contact.ts
  en/…            aynı dosya adları, aynı şekil
```

Her dosya tek bir sabit dışa açar ve bölüm bileşeni onu adıyla alır:

```ts
// src/data/tr/stats.ts
export const stats = {
  items: [
    { value: 1500, suffix: '+', label: 'Mutlu müşteri' },
    { value: 98, suffix: '%', label: 'Memnuniyet oranı' },
  ],
};
```

```astro
const { stats } = getData(locale);
```

**Kurallar:**

- TR ve EN dosyaları **aynı şekilde** olmalı. `src/data/index.ts` içindeki
  `Record<string, typeof tr>` tipi referans olarak `tr`'yi alır: `en` bir alanı kaçırırsa
  `astro check` hata verir. `tests/data.test.ts` de yapıyı karşılaştırır.
- Bir dizi elemanını özelliğe bağlamak için satır marker'ı kullanılır:

  ```ts
  { icon: 'shield', title: 'Güvenli formlar', description: '…' }, // @feature:forms
  ```

  Eleman tek satırda durmalı, yoksa marker yalnızca o satırı siler ve nesne yarım kalır.
  Prettier bu kuralı bilmez: uzun bir elemanı çok satıra açtığında marker kapanış satırında
  kalır ve çıkarma sözdizimini bozar. Bu yüzden `src/data/<dil>/features.ts` `.prettierignore`
  içindedir; benzer bir dosya eklerseniz siz de oraya eklemelisiniz.

- `src/data/tr/nav.ts` ham `href` taşımaz: `route` bir registry anahtarı, `hash` ana sayfa
  içindeki bir bölümdür. Ayrıntı [routing-and-i18n.md](./routing-and-i18n.md#route-registry--srci18nroutests).
- `Features.astro` içindeki `icon` değeri bileşendeki `icons` haritasından gelir
  (`zap`, `shield`, `globe`, `chart`, `sparkles`, `code`). Bilinmeyen bir ad build'i
  **bilerek** patlatır — sessiz boş `<path>` üretmez. Yeni ikon eklemek için
  `src/components/sections/Features.astro` içindeki haritaya SVG `d` değerini ekleyin.
- `src/data/<dil>/privacy.ts` bir **şablon yer tutucusudur**; içindeki `notice` alanı da
  bunu söyler. Yayına almadan önce kendi metninizle değiştirin.

## UI strings: `src/i18n/<lang>.json`

Kısa, tekrar eden metinler burada. Mevcut üst düzey anahtarlar:

```
nav.menu / nav.close / nav.mainMenu / nav.footerMenu / nav.switchLocale
theme.toggle
footer.rights
form.name / form.email / form.message / form.submit / form.sending / form.success / form.error
newsletter.placeholder / newsletter.emailLabel / newsletter.subscribe
blog.title / blog.readMore / blog.minRead / blog.allPosts
redirect.title / redirect.text
notFound.title / notFound.back
consent.text / consent.accept / consent.decline / consent.privacy
slider.prev / slider.next
```

Okuma:

```ts
const t = useTranslations(locale);
t('form.submit');
```

Anahtar o dilde yoksa varsayılan dile, orada da yoksa **anahtarın kendisine** düşülür.
Eksik çeviri sayfayı kırmaz, ekranda görünür kalır.

JSON yorum desteklemediği için bu dosyalar marker taşıyamaz; bir özellik çıkarıldığında
onun anahtarları yerinde kalır. Zararsızdır.

## Theme: `src/styles/global.css`

Ayrı bir `tailwind.config` dosyası **yok** — Tailwind v4 token'ları CSS içinde tanımlanır.

```css
@import 'tailwindcss';
@import '@fontsource-variable/inter';

/* @feature:blog */
@plugin '@tailwindcss/typography';
/* @/feature:blog */

/* @feature:dark-mode */
@custom-variant dark (&:where(.dark, .dark *));
/* @/feature:dark-mode */

@theme {
  --font-sans: 'Inter Variable', system-ui, sans-serif;
  --color-brand-50:  oklch(97% 0.02 262);
  …
  --color-brand-950: oklch(22% 0.09 262);
  --animate-marquee: marquee 30s linear infinite;
  @keyframes marquee { to { transform: translateX(-50%); } }
}
```

### Changing the brand colour

`--color-brand-*` on bir basamaktan oluşur ve tüm bileşenler yalnızca bu ölçeği kullanır
(`bg-brand-600`, `text-brand-400`, `outline-brand-600`…). Renk `oklch(L C H)` biçiminde:
üçüncü değer **ton açısı** (hue). Yalnızca onu değiştirmek tutarlı bir palet verir:

```css
--color-brand-500: oklch(58% 0.2 145);   /* 262 (mavi) → 145 (yeşil) */
```

On bir satırda da aynı açıyı kullanın; açıklık (`L`) ve doygunluk (`C`) değerlerini olduğu
gibi bırakın — ölçeğin dengesi onlardan gelir.

Başka bir renk uzayında çalışmak isterseniz `oklch()` yerine `#rrggbb` de yazabilirsiniz;
Tailwind token'ı olduğu gibi kullanır.

### Changing the font

1. `src/styles/global.css` başındaki `@import '@fontsource-variable/inter';` satırını yeni
   fontunuzla değiştirin (ve `package.json`'daki paketi güncelleyin).
2. `--font-sans` değerini yeni aileyle güncelleyin.
3. **OG görselleri ayrı bir fonttur.** `src/pages/og/[slug].png.ts` fontu CDN'den kendi
   indirir; orayı da güncellemezseniz sosyal paylaşım görselleri eski fontla üretilir.
   Ayrıntı: [deployment.md](./deployment.md#build-requires-network-access).

### Other blocks

- `@layer base` — `html { scroll-behavior: smooth }` ve `body` temel sınıfları.
- `@keyframes nafruContentIn` — sayfa geçişi animasyonu. `@layer` ve `@theme` **dışında**
  durmak zorunda (bkz. [animation.md](./animation.md#sayfa-geçişinin-görsel-dili)).
- `@media (prefers-reduced-motion: reduce)` bloğu — bilerek katman dışında
  (bkz. [animation.md](./animation.md#3-css-hareketi)).

## `public/`

| Dosya         | Not                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------- |
| `favicon.svg` | `BaseLayout` ve kök yönlendirme sayfası buna bağlanır.                                      |
| `logo.svg`    | `siteConfig.logo` ile gösterilir. Farklı bir dosya kullanacaksanız config'i de güncelleyin. |
| `robots.txt`  | `Sitemap:` satırı elle yazılmıştır — alan adını değiştirdiğinizde burayı da değiştirin.     |

`public/` altındaki her şey statik build kökü olan `dist/` içine olduğu gibi kopyalanır.

## Blog content

> **`blog` özelliğine bağlıdır.** Blog seçilmeden üretilmiş bir projede `content/` ve
> `src/content.config.ts` yoktur; bu bölüm sizi ilgilendirmez.

`content/blog/<dil>/<slug>/index.md`:

```md
---
title: 'Template’e hoş geldiniz'
description: 'Bu şablonla neler yapabileceğinize hızlı bir bakış.'
date: 2026-08-01
locale: tr
translationKey: welcome
cover: /images/kapak.jpg      # isteğe bağlı — şemada tanımlı, sayfalar henüz kullanmıyor
---
```

Şema `src/content.config.ts` içinde `astro/zod` ile tanımlıdır: bu şablonda `z`,
`astro:content`'ten değil `astro/zod`'dan import edilir.

- **Dosya adı ön eki** koleksiyon filtresinin ve slug türetmenin dayanağıdır:
  `tr-hosgeldiniz.md` → `/tr/blog/hosgeldiniz/`.
- `locale` alanı ön ekle **tutarlı** olmalı; blog sayfaları koleksiyonu bu alana göre süzer.
  Tutarsızsa yazı listede hiç görünmez ve **build yeşil geçer**.
- `translationKey` diller arası eşleme anahtarıdır; karşılığı olan yazıyla aynı değeri
  taşımalıdır.
- Okuma süresi gövdeden hesaplanır (`src/lib/utils.ts`, 200 kelime/dk, minimum 1).
- Her yazı için (her iki dilde) otomatik bir OG görseli üretilir: `/og/blog-<dosya-adı>.png` —
  ör. `tr-hosgeldiniz.md` → `/og/blog-tr-hosgeldiniz.png`. Slug dosya adıdır: dil ön eki
  korunduğu için iki dilde aynı slug çakışmaz.
