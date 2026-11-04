# Feature removal

Şablonun ana vaadi: **on altyapı özelliğinden herhangi biri tek komutla, geride hiç iz
bırakmadan çıkarılabilir.**

```bash
bun run remove -- blog
bun run remove -- pricing testimonials team      # birden çok, tek koşuda
```

Argümansız çağırırsanız kullanım ve özellik listesi basılır:

```
Kullanım: bun run remove -- <özellik...> [--force] [--no-install] [--no-verify]
```

Motor çıkarma sonrasında **yalnızca iki adım** koşar: `bun install` ve `bun run build`
(bkz. [doğrulama adımı](./feature-removal-matrix.md#verification-and-flags)). Yani başarılı bir
çıkarma size projenin **derlendiğini** söyler — tip denetiminden geçtiğini ya da testlerinin
yeşil olduğunu **söylemez**; motor `astro check` ve `vitest` koşmaz.

Bu ikisi **sizin sorumluluğunuzdadır.** Her çıkarmadan sonra:

```bash
bun run check && bun run test
```

Neden şart: `astro build` tip hatalarını görmez ve bir özellikle birlikte sahipsiz kalan
testleri de görmez (bkz. [tuzaklar](./feature-removal-matrix.md#gotchas)). Üç adımı birden koşan
tek yer çıkarma matrisidir (`bun run test:removal`).

---

## Document map

Bu dosya şablonun ana vaadinin **özetidir**. Aşağıdaki iki dosya konuyu derinleştirir:

| Dosya                                                        | Ne zaman açılır                                                                                                                                 |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [feature-removal-manifest.md](./feature-removal-manifest.md) | `features.manifest.ts`'in anatomisini ya da **kendi çıkarılabilir özelliğinizi** yazarken.                                                      |
| [feature-removal-matrix.md](./feature-removal-matrix.md)     | Marker sözleşmesinin ayrıntıları, motorun çalışma sırası, doğrulama bayrakları, tuzaklar, sınırlar ve `create-cli` sihirbazının kullanımı için. |

---

## Feature list

Tek doğruluk kaynağı `features.manifest.ts`. Aşağıdaki tablo o dosyanın özetidir.

| Özellik        | Ne götürür                                                                                                                                                                                                                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `i18n`         | İngilizce tarafın tamamı (`src/pages/en`, `src/data/en`, `src/i18n/en.json`, `content/blog/en`) ve kök dil yönlendirme sayfası (`src/pages/index.astro`). Ardından `src/pages/tr/**` köke **taşınır**: `/tr/iletisim/` → `/iletisim/`. `astro.config.mjs` içindeki `i18n` bloğu ve sitemap dil eşlemesi de gider. |
| `dark-mode`    | `src/components/ui/ThemeToggle.astro`, `BaseLayout` içindeki tema scripti, `global.css` içindeki `dark` varyantı ve **tüm `dark:` sınıfları** (desen dönüşümüyle).                                                                                                                                                |
| `analytics`    | `src/components/Analytics.astro`, `src/components/ConsentBanner.astro`, `tests/spa-analytics.test.ts`, `site.config.ts` içindeki `analytics` bloğu.                                                                                                                                                               |
| `blog`         | `src/content/`, `src/content.config.ts`, blog listesi/detay sayfaları, `rss.xml.ts`, `src/lib/utils.ts` (+ testi), navigasyondaki Blog girdisi, OG endpoint'indeki blog dalı. **Bağımlılıklar:** `@astrojs/rss`, `@tailwindcss/typography`.                                                                       |
| `forms`        | `ContactForm.astro`, iletişim sayfaları, `contact-form.ts`, form servis adapteri, iletişim mesajları ve SPA form testleri.                                                                                                                                                                                        |
| `pricing`      | `Pricing.astro` + `src/data/*/pricing.ts` + navigasyondaki Fiyatlandırma girdisi.                                                                                                                                                                                                                                 |
| `testimonials` | `Testimonials.astro` + `src/data/*/testimonials.ts`.                                                                                                                                                                                                                                                              |
| `team`         | `Team.astro` + `src/data/*/team.ts`.                                                                                                                                                                                                                                                                              |
| `case-studies` | `CaseStudies.astro` + `src/data/*/case-studies.ts`.                                                                                                                                                                                                                                                               |
| `newsletter`   | `Newsletter.astro` + `src/data/*/newsletter.ts` + `site.config.ts` içindeki `newsletterAction`.                                                                                                                                                                                                                   |

**Çekirdek (çıkarılamaz):** layout, SEO temeli (MetaTags/JsonLd/sitemap/OG), Header, Hero,
LogoCloud, Features, Stats, About, Faq, Cta, Footer, `src/components/ui/**`, view transition
altyapısı ve animasyon motoru.

---

## Marker convention (summary)

Motor kodu iki biçimde işaretlenmiş halde bulur:

- **Blok marker** — açılış ve kapanış satırın TEK içeriği olmalı (baştaki/sondaki boşluk serbest);
  aradaki her şey silinir.
- **Satır marker** — bir kod satırının **sonuna** eklenir; yalnızca o satırı siler.

Biçim birebir uyulmak zorundadır (boşluk sayısı dahil). Tam sözleşme ve en sinsi tuzak için
[feature-removal-matrix.md → Marker sözleşmesi](./feature-removal-matrix.md#marker-sözleşmesi).
