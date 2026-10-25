# Documentation

Bu klasör şablonun referans belgeleridir. Şablonu **klonlayıp değiştirecek** kişi için
yazıldı: her sayfa "ne var"ı değil, **"nasıl değiştiririm"i** anlatır.

Astro, Tailwind ve GSAP'ın kendi dokümanları burada tekrarlanmaz — yalnızca bu projede
nasıl kullanıldıkları yazılır.

---

## ⚠️ Read this first: these docs describe the FULL template

Bu klasör, **on isteğe bağlı özelliğin hepsi açıkken** şablonun nasıl çalıştığını belgeler.
Projeniz sihirbazla (`scripts/create-cli`) bir **alt küme** seçilerek üretildiyse ya da
`bun run remove` ile özellik çıkardıysanız, **seçilmeyen özelliklere ait bölümler
projeniz için geçerli değildir** — anlattıkları dosyalar sizde yoktur.

Belgeler üretilen projeye olduğu gibi kopyalanır (çevrimdışı ve sürümle eşleşmiş olsun diye)
ve **kapsamlarına göre budanmaz.** Bir bölümde adı geçen dosyayı bulamıyorsanız kurulumunuz
bozuk değildir; büyük olasılıkla o özellik projenizde yoktur.

En çok etkilenen yerler (liste kapsayıcı değildir — ilgili sayfaların başında da uyarı var):

| Yer                                                                                                                              | Hangi özellik gerekiyor                    |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| [routing-and-i18n.md](./routing-and-i18n.md) — sayfanın neredeyse tamamı                                                         | `i18n`                                     |
| [sections.md](./sections.md) — katalogda "Özellik marker'ı" sütununda `çekirdek` yazmayan satırlar                               | ilgili bölüm özelliği                      |
| [configuration.md](./configuration.md) — `analytics` / `turnstileSiteKey` / `newsletterAction` alanları ve "Blog içeriği" bölümü | `analytics`, `forms`, `newsletter`, `blog` |
| [deployment.md](./deployment.md) — "Ortam değişkenleri" bölümünün tamamı (Turnstile)                                             | `forms`                                    |
| [architecture.md](./architecture.md) — dizin haritası                                                                            | ilgili özellikler                          |
| [troubleshooting.md](./troubleshooting.md) — Turnstile / analytics / blog maddeleri                                              | `forms`, `analytics`, `blog`               |

**`features.manifest.ts` budanmaz.** Sihirbaz manifesti yalnızca _okur_; üretilen projede
dosya olduğu gibi durur. Yani `bun run remove` argümansız çağrıldığında **projenizde
olmayan** özellikleri de listelemeye devam eder. Zaten çıkarılmış bir özelliği çıkarmaya
çalışmak zararsızdır (var olmayan yollar sessizce atlanır), ama liste bir envanter değildir.

---

## Which page, when

| Sayfa                                                                                | Ne zaman okunur                                                                                                   |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| [architecture.md](./architecture.md)                                                 | Şablonu ilk kez açtığınızda. Dizin haritası, veri akışı, statik + Cloudflare kararı, sıfır-hydration'ın maliyeti. |
| [configuration.md](./configuration.md)                                               | Marka, metin ve renkleri kendinize göre ayarlarken. `site.config.ts`, `src/data/**`, `@theme` token'ları.         |
| [sections.md](./sections.md)                                                         | Bir bölümü değiştirirken, kaldırırken veya yeni bölüm eklerken. Hangi bölüm hangi veri dosyasından besleniyor.    |
| [routing-and-i18n.md](./routing-and-i18n.md)                                         | URL eklerken, slug lokalize ederken, **yeni dil eklerken**.                                                       |
| [feature-removal.md](./feature-removal.md)                                           | `bun run remove` kullanırken ve **kendi çıkarılabilir özelliğinizi** yazarken. Şablonun ana vaadi burada.         |
| [animation.md](./animation.md)                                                       | Yeni bir animasyon eklerken veya bir hareketi kapatırken.                                                         |
| [deployment.md](./deployment.md)                                                     | Cloudflare'e çıkarken, secret ayarlarken, CI kurarken.                                                            |
| [incremental-build.md](./incremental-build.md)                                       | Build hook'unu kurarken: yalnızca yeni/değişen yazıların işlenmesi, kilit, önbellek.                              |
| [seo-checklist.md](./seo-checklist.md)                                               | Search Console, sitemap, canonical ve structured-data yayına alma kontrolü.                                       |
| [analytics.md](./analytics.md)                                                       | Plausible/GA4 kurulumu, event envanteri, çifte sayım önleme ve canlı doğrulama.                                   |
| [troubleshooting.md](./troubleshooting.md)                                           | Bir şey beklenmedik davrandığında. Bu sayfadaki her madde bu şablonda gerçekten yaşandı.                          |

## Five-minute start

```bash
bun install
bun run dev            # http://localhost:4321
```

`i18n` özelliği projenizde duruyorsa kök `/` adresi tarayıcı dilinize göre `/tr/` veya
`/en/` adresine yönlendirir (bkz. [routing-and-i18n.md](./routing-and-i18n.md)). Tek dilli
üretilmiş bir projede yönlendirme sayfası yoktur ve ana sayfa doğrudan `/` adresindedir.

Sırayla değiştireceğiniz üç dosya:

1. `src/config/site.config.ts` — site adı, başlık, açıklama, URL, sosyal hesaplar.
2. `src/data/<dil>/*.ts` — tüm bölüm içerikleri (tek dilli projede tek klasör vardır).
3. `src/styles/global.css` → `@theme` bloğu — marka renkleri ve font.

## Commands

Hepsi `package.json` içinde tanımlı:

| Komut                            | Ne yapar                                                                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run dev`                    | `astro dev` — geliştirme sunucusu.                                                                                                                          |
| `bun run build`                  | `astro build` — düz statik çıktıyı `dist/` altında üretir. **Ağ erişimi gerektirir** (bkz. [deployment.md](./deployment.md#build-requires-network-access)). |
| `bun run preview`                | `astro preview` — üretilmiş çıktıyı yerelde sunar.                                                                                                          |
| `bun run check`                  | `astro check` — tip denetimi.                                                                                                                               |
| `bun run test`                   | `vitest run` — tüm `*.test.ts` dosyaları. `bun run test` yazmayın; o komut Bun'ın farklı test koşucusunu açar.                                              |
| `bun run format`                 | `prettier --write .` — kapsam ve istisnalar `.prettierignore` içinde.                                                                                       |
| `bun run format:check`           | `prettier --check .` — yazmadan denetler.                                                                                                                   |
| `bun run remove -- <özellik...>` | Bir veya birden çok özelliği projeden çıkarır. Argümansız çağrılırsa özellik listesini basar.                                                               |
| `bun run test:removal`           | Çıkarma kombinasyon matrisi (14 kombinasyon, makineye göre 4-7 dk).                                                                                         |

Node sürümü: **>= 22.12** (`package.json` → `engines`). Astro 7'nin tabanı budur.

## Generating a new project

Şablonu doğrudan klonlamak yerine sihirbazla istediğiniz özellik alt kümesiyle
temiz bir proje üretebilirsiniz:

```bash
cd scripts/create-cli && bun install && cd ../..
node scripts/create-cli/index.mjs my-landing
```

Sihirbazın bayrakları ve dil modları: [feature-removal-matrix.md → Wizard-driven generation](./feature-removal-matrix.md#wizard-driven-generation).

> `cd scripts/create-cli && bun install` adımı **atlanamaz**: sihirbazın `@clack/prompts`
> bağımlılığı `scripts/create-cli/node_modules` altında durur, şablonun kendi ağacında değil.
