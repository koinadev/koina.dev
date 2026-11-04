# Section catalog

> **Katalog şablonun TAM sürümünü listeler.** "Özellik marker'ı" sütununda `çekirdek`
> yazmayan satırlar yalnızca o özellik projenizde duruyorsa vardır; seçilmemişse bileşen de
> veri dosyası da silinmiştir. Ayrıntı için [docs/README.md](./README.md).

Bölümler `src/components/sections/` altındadır. Her biri:

- içeriğini `getData(locale)` üzerinden `src/data/<dil>/<dosya>.ts` dosyasından alır,
- kısa arayüz metinlerini `useTranslations(locale)` ile `src/i18n/<dil>.json`'dan alır,
- `locale` prop'u alır (varsayılan `'tr'`),
- animasyonu `data-*` attribute'larıyla bildirir (bkz. [animation.md](./animation.md)).

**Hiçbir bölümde sabit metin yoktur.** Bir metni değiştirmek için bileşene değil, veri
dosyasına gidin.

## Catalog

| Bölüm                | Veri kaynağı                                 | Sözlük anahtarları                | Özellik marker'ı                                 | Anchor          | Varyantlar                                |
| -------------------- | -------------------------------------------- | --------------------------------- | ------------------------------------------------ | --------------- | ----------------------------------------- |
| `Header.astro`       | `nav` (`src/data/<dil>/nav.ts`)              | `nav.*`, `theme.toggle`           | çekirdek (içinde `i18n` ve `dark-mode` blokları) | —               | —                                         |
| `Hero.astro`         | `hero`                                       | —                                 | çekirdek                                         | —               | `centered` (varsayılan), `split`, `media` |
| `LogoCloud.astro`    | `logos`                                      | —                                 | çekirdek                                         | —               | —                                         |
| `Features.astro`     | `features`                                   | —                                 | çekirdek                                         | `#features`     | `grid` (varsayılan), `alternating`        |
| `About.astro`        | `about`                                      | —                                 | çekirdek                                         | `#about`        | —                                         |
| `Stats.astro`        | `stats`                                      | —                                 | çekirdek                                         | —               | —                                         |
| `Team.astro`         | `team`                                       | —                                 | `team`                                           | `#team`         | —                                         |
| `Testimonials.astro` | `testimonials`                               | `slider.prev`, `slider.next`      | `testimonials`                                   | `#testimonials` | —                                         |
| `CaseStudies.astro`  | `caseStudies`                                | —                                 | `case-studies`                                   | `#case-studies` | —                                         |
| `Pricing.astro`      | `pricing`                                    | —                                 | `pricing`                                        | `#pricing`      | — (aylık/yıllık geçişi bileşenin içinde)  |
| `Faq.astro`          | `faq`                                        | —                                 | çekirdek                                         | `#faq`          | —                                         |
| `Cta.astro`          | `cta`                                        | —                                 | çekirdek                                         | `#cta`          | —                                         |
| `Newsletter.astro`   | `newsletter` + `siteConfig.newsletterAction` | `newsletter.*`                    | `newsletter`                                     | —               | —                                         |
| `ContactForm.astro`  | `contact` + `siteConfig.turnstileSiteKey`    | `form.*`                          | `forms`                                          | `#contact`      | —                                         |
| `Footer.astro`       | `nav` (`links` + `legal`)                    | `nav.footerMenu`, `footer.rights` | çekirdek                                         | —               | —                                         |

Varyant seçimi sayfa tarafında yapılır:

```astro
<Hero locale="tr" variant="split" />
<Features locale="tr" variant="alternating" />
```

## Home page section order

`src/pages/tr/index.astro` (ve her dilin kopyası) bölümleri şu sırayla dizer:

```
Hero → LogoCloud → Features → About → Stats → Team → Testimonials →
CaseStudies → Pricing → Faq → Cta → ContactForm → Newsletter
```

Sırayı değiştirmek için satırları taşımanız yeterlidir. Çıkarılabilir bölümler HTML yorumu
marker'larıyla sarılıdır; **taşırken marker çiftini birlikte taşıyın**:

```astro
<!-- @feature:pricing -->
<Pricing locale="tr" />
<!-- @/feature:pricing -->
```

Bölümü ana sayfadan çıkarıp ayrı bir sayfaya taşımak istiyorsanız import satırını da
(`/* @feature:pricing */` satır marker'ıyla birlikte) taşımayı unutmayın.

## Non-section components

| Bileşen                              | Görev                                                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `components/ui/Container.astro`      | `max-w-6xl` + yatay padding. Tüm bölümler bunu kullanır.                                              |
| `components/ui/Section.astro`        | Dikey ritim (`py-16 sm:py-24`) + `scroll-mt-20` (sticky header için) + isteğe bağlı `id`.             |
| `components/ui/SectionHeading.astro` | `eyebrow` / `title` / `description` üçlüsü, `align: 'center' \| 'left'`. Kendisi `data-reveal` taşır. |
| `components/ui/Button.astro`         | `variant: 'primary' \| 'secondary' \| 'ghost'`, `size: 'md' \| 'lg'`, `href` verilirse `<a>` üretir.  |
| `components/ui/Card.astro`           | Kenarlıklı yüzey.                                                                                     |
| `components/ui/Badge.astro`          | Küçük marka rozeti.                                                                                   |
| `components/ui/Input.astro`          | Etiketli input/textarea (`textarea` prop'u ile).                                                      |
| `components/ui/ThemeToggle.astro`    | Tema düğmesi (`dark-mode` özelliği).                                                                  |
| `components/ui/NavProgress.astro`    | Gezinme ilerleme çubuğu. Hiçbir özelliğe bağlı değil.                                                 |
| `components/seo/MetaTags.astro`      | title/description/canonical/OG/hreflang.                                                              |
| `components/seo/JsonLd.astro`        | Verilen nesneyi `<script type="application/ld+json">` olarak basar.                                   |
| `components/Analytics.astro`         | Onaya bağlı analytics enjeksiyonu (`analytics`).                                                      |
| `components/ConsentBanner.astro`     | Çerez onay bandı (`analytics`).                                                                       |

`Faq.astro` ayrıca bir `FAQPage` JSON-LD'si, blog detay sayfası bir `Article` JSON-LD'si,
`BaseLayout` ise bir `Organization` JSON-LD'si basar.

## Interactivity inside sections

Hydration olmadığı için her interaktif bölüm kendi `<script>` etiketini taşır ve
[architecture.md → sıfır hydration](./architecture.md#sıfır-hydration) kurallarına uyar.

| Bölüm                 | Ne yapıyor                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `Header.astro`        | Mobil menü aç/kapa (delege dinleyici), dil seçimini `localStorage.locale`'a yazma.                                                    |
| `Testimonials.astro`  | Yatay kaydırma düğmeleri (`scrollBy`). Kaydırma kabı `tabindex="0"` — scrollbar gizli olduğu için klavye erişimi başka türlü olmazdı. |
| `Pricing.astro`       | Aylık/yıllık geçişi. İki düğme **aynı** sınıf dizesini paylaşır; farkı yalnızca `aria-pressed` yaratır.                               |
| `Newsletter.astro`    | Yok — düz `POST` formu. `data-astro-reload` **şart**: ClientRouter POST formlarını yakalayıp kendi fetch'ini yapıyor.                 |
| `ContactForm.astro`   | `fetch` ile gönderim + Turnstile kutusunun her gezinmede yeniden çizilmesi. `data-astro-reload` olmadan gönderim çift tetikleniyordu. |
| `ThemeToggle.astro`   | `html.dark` sınıfını çevirir, `localStorage.theme` yazar.                                                                             |
| `ConsentBanner.astro` | Karar verilmemişse bandı gösterir; `astro:page-load`'a bağlı.                                                                         |

## Adding a new section

1. **Veriyi yazın** — `src/data/tr/gallery.ts` ve `src/data/en/gallery.ts`, aynı şekilde:

   ```ts
   export const gallery = {
     eyebrow: 'Galeri',
     title: 'İşlerimizden seçmeler',
     items: [{ src: '/images/1.jpg', alt: 'Proje 1' }],
   };
   ```

2. **Re-export edin** — `src/data/tr/index.ts` ve `src/data/en/index.ts`:

   ```ts
   export * from './gallery';
   ```

   Bölümü çıkarılabilir yapacaksanız satır sonuna marker ekleyin (bkz.
   [feature-removal-manifest.md](./feature-removal-manifest.md#kendi-özelliğinizi-çıkarılabilir-yapmak)).

3. **Bileşeni yazın** — `src/components/sections/Gallery.astro`:

   ```astro
   ---
   import Section from '../ui/Section.astro';
   import Container from '../ui/Container.astro';
   import SectionHeading from '../ui/SectionHeading.astro';
   import { getData } from '../../data';
   import type { Locale } from '../../i18n/utils';

   interface Props { locale?: Locale }
   const { locale = 'tr' } = Astro.props;
   const { gallery } = getData(locale);
   ---
   <Section id="gallery">
     <Container>
       <SectionHeading eyebrow={gallery.eyebrow} title={gallery.title} />
       <div class="grid gap-6 sm:grid-cols-3">
         {gallery.items.map((item, i) => (
           <img src={item.src} alt={item.alt} loading="lazy" class="rounded-2xl"
                data-reveal data-reveal-delay={String((i % 3) * 0.1)} />
         ))}
       </div>
     </Container>
   </Section>
   ```

4. **Sayfaya ekleyin** — `src/pages/tr/index.astro` ve her dilin kopyası.

5. **Doğrulayın** — `bun run check && bun run test && bun run build`.

Yeni metin bir arayüz etiketiyse (buton, aria-label, durum mesajı) `src/data/` yerine
`src/i18n/*.json` sözlüğüne koyun ve `useTranslations` ile okuyun.
