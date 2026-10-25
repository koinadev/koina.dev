# Architecture

## Özet

| Karar        | Değer                                                                         | Nerede                                      |
| ------------ | ----------------------------------------------------------------------------- | ------------------------------------------- |
| Framework    | Astro 7                                                                       | `package.json` → `astro: ^7.2.3`            |
| Çıktı modu   | `output: 'static'`                                                            | `astro.config.mjs`                          |
| Hosting      | Cloudflare Workers Static Assets, düz `dist/` statik çıktısı                  | `wrangler.toml`                             |
| CSS          | Tailwind v4, `@tailwindcss/vite` ile — **ayrı `tailwind.config` dosyası yok** | `astro.config.mjs`, `src/styles/global.css` |
| Animasyon    | GSAP (ScrollTrigger + SplitText)                                              | `src/lib/animations.ts`                     |
| UI framework | **yok** — hydration yok                                                       | —                                           |
| Tip denetimi | `astro/tsconfigs/strict`                                                      | `tsconfig.json`                             |
| Node         | `>= 22.12`                                                                    | `package.json` → `engines`                  |

## Statik site ve ayrı form API'si

Sayfaların tamamı build zamanında düz `dist/` dizinine yazılır; bu repoda server endpoint veya
Cloudflare adapter yoktur. Turnstile token'ının sunucu doğrulaması seçilen sağlayıcıda yapılır:
ayrı custom Worker, Formspark ya da Web3Forms. Böylece landing page başka bir statik host'a da
taşınabilir ve custom API yalnız şirket içi sitelerde kullanılır. Ayrıntı:
[deployment.md](./deployment.md).

## Directory map

> Harita şablonun **tam** sürümünü gösterir. Sihirbazla üretilmiş bir projede seçilmeyen
> özelliklerin dosyaları yoktur ve `scripts/create-cli/` hiç kopyalanmaz (bkz.
> [docs/README.md](./README.md)).

```
astro.config.mjs           Astro yapılandırması: site, prefetch, i18n, sitemap
features.manifest.ts       Çıkarılabilir özellik tanımları (bkz. feature-removal.md)
tsconfig.json              strict + `@/*` → `src/*` alias'ı
vitest.config.ts           test kapsamı: tests/**/*.test.ts

scripts/
  remove-feature.ts        çıkarma motoru (bun run remove)
  test-removal.ts          çıkarma kombinasyon matrisi (bun run test:removal)
  lib/markers.ts           marker sökme + desen uygulama + süpürme kapsamı sabitleri
  lib/moves.ts             dosya taşıma ve geri alma
  create-cli/
    index.mjs              proje üretme sihirbazı (kendi node_modules'ı vardır)

src/
  config/site.config.ts    marka, sosyal hesaplar, analytics sağlayıcısı, turnstile site key
  data/index.ts            getData(locale) — dil paketi seçici
  data/tr/*.ts             Türkçe bölüm içerikleri
  data/en/*.ts             İngilizce bölüm içerikleri (aynı şekil)
  i18n/tr.json, en.json    kısa UI metinleri (buton, aria-label, durum mesajı)
  i18n/utils.ts            Locale tipi, useTranslations, getLocaleFromUrl
  i18n/routes.ts           route registry, routePath/alternatesFor/navHref
  layouts/BaseLayout.astro tek layout: head, tema scripti, ClientRouter, Header/Footer
  components/
    seo/MetaTags.astro     title/description/canonical/OG/hreflang
    seo/JsonLd.astro       ham JSON-LD basıcı
    ui/*.astro             Container, Section, SectionHeading, Button, Badge, Card,
                           Input, ThemeToggle, NavProgress
    sections/*.astro       sayfa bölümleri (bkz. sections.md)
    Analytics.astro        onaya bağlı analytics enjeksiyonu
    ConsentBanner.astro    çerez onay bandı
  lib/animations.ts        GSAP init: reveal, counter, split title
  lib/transitions.ts       sayfa geçişinin görsel dili
  lib/utils.ts             formatDate, readingTime (yalnızca blog kullanır)
  lib/build-cache.ts       içerik adresli build önbelleği (OG PNG, .md ikizi) — bkz. incremental-build.md
  integrations/            page-markdown (.md ikizi), build-cache (çöp toplama + rapor)
  styles/global.css        Tailwind girişi, @theme token'ları, dark varyantı, keyframe'ler
  content.config.ts        blog koleksiyonu şeması (loader + zod şeması)
  loaders/blog.ts          blog loader'ı: yerel glob + opsiyonel uzak kaynak, tek koleksiyon
  loaders/blog-remote.ts   uzak JSON adaptörü (yalnızca endpoint doluysa çalışır)
  components/blog/Cover.astro  kapak görseli — yerel ImageMetadata / uzak URL dallanması
  env.d.ts                 tarayıcı global'leri ve window.turnstile tip bildirimleri
  pages/
    index.astro            kök `/` — dil algılayan yönlendirme stub'ı
    404.astro
    tr/…, en/…             prefixli sayfalar (bkz. routing-and-i18n.md)
    og/[slug].png.ts       satori + resvg ile OG görselleri

content/                   İÇERİK — kasıtlı olarak `src/` DIŞINDA
  blog/<dil>/<slug>/
    index.md               yazının markdown'ı (frontmatter şemayla doğrulanır)
    cover.jpg              yazıya ait görseller, yazının YANINDA durur
                           (`index` son eki id'den düşer: id yine `<dil>/<slug>`)

tests/                     vitest — birim testler ve regresyon kilitleri
public/                    favicon.svg, logo.svg, robots.txt
docs/                      bu klasör
```

## Veri akışı

Metin hiçbir bileşenin içine yazılmaz. İki ayrı kanal var:

```
src/data/<dil>/<bölüm>.ts     uzun içerik (başlık, paragraf, kart listeleri, fiyat planları)
        │
        ├─ src/data/<dil>/index.ts  (re-export)
        │
        └─ src/data/index.ts        getData(locale) → o dilin paketi
                    │
                    └─ Bölüm bileşeni:  const { hero } = getData(locale);
                                │
                                └─ Sayfa:  <Hero locale="tr" />
                                            │
                                            └─ BaseLayout (head, header, footer)

src/i18n/<dil>.json           kısa UI metni (buton etiketi, aria-label, durum mesajı)
        └─ useTranslations(locale) → t('form.submit')
```

Ayrımın kuralı basit: **sayfa içeriği** `src/data/`, **arayüz metni** `src/i18n/*.json`.
Aynı metin iki bölümde geçiyorsa ve içerik değilse (ör. "Önceki"/"Sonraki") sözlüğe girer.

`getData` bilinmeyen bir dilde sessizce `tr` paketine düşer (`src/data/index.ts`).
`useTranslations` ise anahtar o dilde yoksa varsayılan dile, o da yoksa **anahtarın kendisini**
döndürür (`src/i18n/utils.ts`) — eksik çeviri sayfayı kırmaz, görünür kalır.

## Sıfır hydration

Projede hiçbir `client:*` direktifi ve hiçbir UI framework'ü yok. İnteraktivite düz
`<script>` etiketleriyle yazılır: mobil menü, tema düğmesi, yorum slider'ı, fiyat
periyodu düğmeleri, onay bandı, iletişim formu.

**Kazanç:** gönderilen JS yalnızca yazdığınız birkaç KB + GSAP; `astro-island` yok,
framework runtime'ı yok.

**Maliyet — bu üç kural pazarlık konusu değil:**

1. **Dinleyiciler `document`'a bağlanır, elemana değil.**
   `<ClientRouter />` açık olduğu için sayfa geçişlerinde DOM değişir; elemana doğrudan
   bağlanan bir dinleyici ilk geçişten sonra ölü kalır. Şablondaki tüm script'ler
   `document.addEventListener(..., e => e.target.closest('[data-x]'))` desenini kullanır.

2. **Bir modül script'i oturumda BİR KEZ çalışır.**
   Astro geçişte aynı script'i yeniden çalıştırmaz. Her gezinmeden sonra tekrar koşması
   gereken iş `astro:page-load` olayına bağlanır — GSAP init'i (`BaseLayout.astro`),
   onay bandı görünürlüğü (`ConsentBanner.astro`), Turnstile kutusu (`ContactForm.astro`)
   böyle çalışır.

3. **Durum DOM'da veya `window`'da yaşar.**
   Swap'tan sonra eski düğüme tutulan bir referans hiçbir şey yapmaz. Kalıcı olması gereken
   bayraklar `window` üzerinde tutulur (`Analytics.astro`), kalıcı olması gerekmeyenler
   her seferinde yeniden sorgulanır.

Bu üç kuralın ihlali **build'i kırmaz**; tarayıcıda sessizce yanlış davranır. Sorun giderme
sayfasındaki [view transition bölümü](./troubleshooting.md#script-doesnt-run-after-view-transition)
gerçek örnekleri listeler.

## SPA hissi nereden geliyor

Üç parça birlikte çalışıyor:

1. **Prefetch** — `astro.config.mjs`: `prefetch: { prefetchAll: true, defaultStrategy: 'viewport' }`.
   Varsayılan `hover` yerine `viewport`: ilk ekranda görünen nav linklerinin HTML'i kullanıcı
   tıklamadan önce indirilir.
2. **View transition** — `BaseLayout.astro` içindeki `<ClientRouter />`, geçiş animasyonu
   `src/lib/transitions.ts`. Yalnızca `<main>` animasyonlanır; Header ve Footer
   `transition:animate="none"` ile yerinde kalır.
3. **İlerleme çubuğu** — `src/components/ui/NavProgress.astro`. Prefetch'in yetişemediği
   yavaş gezinmelerde tıklamanın işlendiğini gösterir; 140 ms altındaki geçişlerde hiç görünmez.

`transition:persist` **bilerek kullanılmıyor**: korunan DOM düğümü eski sayfanın durumunu
saklar, aktif nav linki ve dil değiştiricinin hedefi bayat kalırdı.

## Third-party scripts

Şablonda **Partytown yok** — bilinçli bir karar.

Partytown üçüncü parti script'leri bir web worker'a taşır ve bunun için her sayfa
yüklemesinde bir **service worker kaydeder**. Buradaki tek üçüncü parti script analytics ve
o script zaten (a) onay verilene kadar hiç yüklenmiyor, (b) `defer`/`async` ile geliyor,
(c) küçük. Yani Partytown'ın kazancı sıfıra yakın; buna karşılık maliyeti gerçek: service
worker kaydı **onaydan önce bile** yapılırdı ve bu, "onaydan önce hiçbir üçüncü parti
yüklenmez" ilkesiyle doğrudan çelişirdi.

Gerçekten ağır bir üçüncü parti script eklerseniz (chat widget'ı, heatmap, A/B aracı) doğru
yol Partytown'ı **o zaman** kurmaktır:

```bash
bunx astro add partytown
```

ve ilgili script'e `type="text/partytown"` vermek. Kurulumu şablonun içinde hazır
bekletmek, çoğu projede yalnızca bir service worker maliyeti bırakırdı.

## Test katmanları

| Katman          | Komut                  | Neyi güvenceye alır                                                         |
| --------------- | ---------------------- | --------------------------------------------------------------------------- |
| Tip denetimi    | `bun run check`        | Astro/TS tip hataları. Build bunları **görmez**.                            |
| Birim testler   | `bun run test`         | i18n, route, data, marker, taşıma; ayrıca kaynak-metin regresyon kilitleri. |
| Build           | `bun run build`        | Şablonun gerçekten derlendiği.                                              |
| Çıkarma matrisi | `bun run test:removal` | Özellik çıkarıldıktan **sonra** üçünün de hâlâ geçtiği.                     |

Dördü de `.github/workflows/ci.yml` içinde bu sırayla koşuyor.
