# koina.dev

Koina'nın web sitesi. nafru astro-template şablonundan üretildi;
aşağıdaki belgeler şablonun kendi belgeleridir ve hâlâ geçerlidir.

```bash
bun install
bun run dev      # http://localhost:4321
```

Koina'ya özgü parçalar: `src/components/sections/{KoinaHero,Roles,Season,Rhythm}.astro`,
`src/pages/{tr,en}/{katil,join,etkinlikler,events}.astro`, `src/messages/*/` içerikleri.
Lisans: AGPL-3.0 (şablondan gelen dosyaların orijinal MIT bildirimi
`LICENSES/MIT-astro-template.txt` içinde).

---

# Nafru Astro Landing Template

Birden çok proje için kurulmuş bir **landing page şablonu**: Astro 7, Tailwind CSS 4, Cloudflare
Workers ve GSAP. UI framework yok, hydration yok — çıktı statik HTML; tarayıcıya giden JavaScript
yalnızca animasyonlar ve birkaç küçük etkileşim. Şablonun ayırt edici yanı içeriği değil
**kalıbı**: on isteğe bağlı özelliğin her biri tek komutla projeden çıkarılabilir, böylece her yeni
iş için aynı depoyu sadeleştirerek başlarsınız.

**Bölüm kütüphanesi** (15 bölüm bileşeni): Header, Hero, LogoCloud, Features, About, Stats, Team,
Testimonials, CaseStudies, Pricing, Faq, Cta, Newsletter, ContactForm, Footer. Hepsi
`src/data/<dil>/*.ts` dosyalarından beslenir; bileşenlerde sabit metin yoktur.

**Altyapı:** TR/EN i18n ve lokalize slug'lar, karanlık tema, blog (content collections + RSS),
Turnstile korumalı iletişim formu, analytics + cookie consent, SEO (meta, JSON-LD, sitemap) ve
build zamanında üretilen OG görselleri.

Node **>= 22.12** gerekir (`package.json` → `engines`).

---

## Quick start

Şablonu klonlamak yerine, istediğiniz özellik alt kümesiyle **temiz bir proje üretin**:

```bash
cd scripts/create-cli && bun install && cd ../..
node scripts/create-cli/index.mjs my-landing
```

> `cd scripts/create-cli && bun install` adımı atlanamaz: sihirbazın `@clack/prompts`
> bağımlılığı `scripts/create-cli/node_modules` altında durur, şablonun kendi ağacında değil.

Sihirbaz özellikleri, dili ve paket yöneticisini sorar; seçilmeyenleri çıkarma motoruna
çıkarttırır. Soru sormadan koşmak için bayrak verin — `--features=a,b,c`, `--all`, `--minimal`,
`--lang=tr|en|both`, `--yes` ve birkaç tanesi daha; tam liste
[docs/feature-removal-matrix.md → Wizard-driven generation](./docs/feature-removal-matrix.md#wizard-driven-generation).

Şablonun kendisiyle çalışmak isterseniz (tüm özellikler açık):

```bash
bun install
bun run dev            # http://localhost:4321
```

Sırayla değiştireceğiniz üç yer: `src/config/site.config.ts`, `src/data/<dil>/*.ts` ve
`src/styles/global.css` içindeki `@theme` bloğu — bkz.
[docs/configuration.md](./docs/configuration.md).

---

## Core idea: `bun run remove`

Bir özelliği projeden çıkarmak tek komuttur:

```bash
bun run remove -- pricing
bun run remove -- i18n blog          # birden çok özellik aynı anda
bun run remove                       # argümansız: özellik listesini basar
```

Çıkarılabilir on özellik:

| Özellik        | Ne götürür                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `i18n`         | İngilizce taraf, dil ön ekli routing ve dil algılayan kök sayfa (`/tr/iletisim` → `/iletisim`) |
| `dark-mode`    | Tema düğmesi, tema scripti ve tüm `dark:` sınıfları                                            |
| `analytics`    | Analytics script'i ve cookie consent bandı                                                     |
| `blog`         | Content collections, blog sayfaları ve RSS                                                     |
| `forms`        | Çoklu sağlayıcılı iletişim formu ve Turnstile                                                  |
| `pricing`      | Fiyatlandırma tablosu                                                                          |
| `testimonials` | Müşteri yorumları slider'ı                                                                     |
| `team`         | Ekip bölümü                                                                                    |
| `case-studies` | Başarı hikayeleri kartları                                                                     |
| `newsletter`   | Bülten kayıt formu                                                                             |

Motor sınırları **marker yorumlarından** okur (`/* @feature:pricing */` … `/* @/feature:pricing */`)
ve silinecek dosyaları `features.manifest.ts` içinden alır. Kendi çıkarılabilir özelliğinizi
yazmak da aynı iki adımdır.

Motor çıkarma sonrası yalnızca `bun install` + `bun run build` koşar — `astro check` ve `vitest`
zincirin parçası değil; her çıkarmadan sonra `bun run check && bun run test` sizin sorumluluğunuzdadır.
Motor git'e dayanır (kirli ağaçta çalışmaz, hatada geri alır). Ayrıntı:
[docs/feature-removal.md](./docs/feature-removal.md).

---

## Commands

En sık kullanılanlar — tam liste [docs/README.md → Commands](./docs/README.md#commands):

| Komut                            | Ne yapar                                          |
| -------------------------------- | ------------------------------------------------- |
| `bun run dev`                    | Geliştirme sunucusu (http://localhost:4321).      |
| `bun run build`                  | Prod build. **Ağ erişimi ister** (aşağıya bakın). |
| `bun run build:incremental`      | Build hook için artımlı build (aşağıya bakın).    |
| `bun run check`                  | `astro check` — tip denetimi.                     |
| `bun run test`                   | `vitest run`.                                     |
| `bun run remove -- <özellik...>` | Bir veya daha çok özelliği çıkarır.               |
| `bun run test:removal`           | Çıkarma matrisi (14 kombinasyon, 4-7 dk).         |

---

## Documentation

Derinlik `docs/` altında; her sayfa "ne var"ı değil "nasıl değiştiririm"i anlatır.

| Sayfa                                                    | İçerik                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [docs/README.md](./docs/README.md)                       | Giriş, hangi sayfa ne zaman okunur, beş dakikada başlangıç.                          |
| [docs/architecture.md](./docs/architecture.md)           | Dizin haritası, veri akışı, statik + Cloudflare kararı, sıfır-hydration'ın maliyeti. |
| [docs/configuration.md](./docs/configuration.md)         | `site.config.ts`, `src/data/**`, sözlükler, `@theme` token'ları.                     |
| [docs/sections.md](./docs/sections.md)                   | Bölüm kataloğu: hangi bölüm hangi veriden beslenir, varyantlar, yeni bölüm ekleme.   |
| [docs/routing-and-i18n.md](./docs/routing-and-i18n.md)   | URL'ler, lokalize slug'lar, hreflang, yeni dil ekleme.                               |
| [docs/feature-removal.md](./docs/feature-removal.md)     | Marker sözleşmesi, manifest, kendi özelliğinizi yazma, sihirbaz bayrakları.          |
| [docs/animation.md](./docs/animation.md)                 | GSAP kurulumu, reveal deseni, sayfa geçişleri, reduced motion.                       |
| [docs/deployment.md](./docs/deployment.md)               | Cloudflare'e çıkma, secret'lar, CI, deploy öncesi kontrol listesi.                   |
| [docs/incremental-build.md](./docs/incremental-build.md) | Build hook, artımlı build, önbellek; Cloudflare, Vercel ve GitHub Actions kurulumu.  |
| [docs/troubleshooting.md](./docs/troubleshooting.md)     | Bu şablonda gerçekten yaşanmış sorunlar ve çözümleri.                                |

> `docs/` şablonun **tam** sürümünü anlatır. Sihirbazla bir alt küme ürettiyseniz ya da özellik
> çıkardıysanız, o özelliklere ait bölümler projeniz için geçerli değildir.

---

## Build hook ile sürekli build

Blog yazıları dışarıdan eklenip build hook'u sık sık tetikleniyorsa `bun run build` yerine
`bun run build:incremental` kullanın. Girdilerin parmak izini son **başarılı** build ile
karşılaştırır; yeni/değişen/silinen yazıları listeler, hiçbir şey değişmediyse build'i atlar.
Build koşarsa OG görselleri ve `.md` ikizleri yalnızca yeni ya da değişen yazılar için yeniden
üretilir, gerisi önbellekten gelir. Aynı anda tek build koşar; üst üste gelen tetikler sıraya girer.

```bash
bun run build:incremental -- --dry-run   # yalnızca planı yazar
bun run build:incremental -- --force     # karşılaştırmayı atlar
```

| Ortam              | Nasıl bağlanır                                                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Cloudflare**     | Build komutu `bun run build:incremental`. Önbellek `node_modules/.astro/` altında, Workers Builds bunu build'ler arasında saklar.      |
| **Vercel**         | Build komutu `bun run build:incremental`. `node_modules/**` önbelleği saklanır.                                                        |
| **GitHub Actions** | [`build-hook.yml`](./.github/workflows/build-hook.yml): `repository_dispatch` (`build-hook`, `build-hook-force`) ya da elle tetikleme. |

GitHub Actions için hook çağrısı `contents: write` yetkili bir token ve `CLOUDFLARE_API_TOKEN` /
`CLOUDFLARE_ACCOUNT_ID` secret'larını ister. Ayrıntı, sınırlar ve gerekçeler:
[docs/incremental-build.md](./docs/incremental-build.md).

---

## Build requires network access

OG görseli endpoint'i (`src/pages/og/[slug].png.ts`) satori ile render eder ve Inter fontunun
**`latin` ve `latin-ext`** alt kümelerini **build sırasında** jsDelivr'dan indirir. İki alt küme de
şarttır: `latin` Türkçe'ye özgü **ş/ğ/ı/İ** gliflerini içermez.

Sonuç: **ağ erişimi olmayan bir CI'da `bun run build` başarısız olur** (artımlı build'de tamamen önbellekli bir koşu font indirmez). Ayrıntı ve seçenekler
[docs/deployment.md → Build requires network access](./docs/deployment.md#build-requires-network-access).

---

## License

[MIT](./LICENSE)
