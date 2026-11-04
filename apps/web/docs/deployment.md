# Deployment

Hedef: **Cloudflare Workers Static Assets** üzerinde statik Astro çıktısı. Form API'si seçime
göre ayrı custom Worker, Formspark veya Web3Forms'tur; bu site build'ine server adapter eklenmez.

Statik asset istekleri Workers'ta da Pages'teki gibi ücretsiz ve sınırsızdır ("Requests to static
assets are free and unlimited", developers.cloudflare.com/workers/platform/pricing), yani Pages'te
kalmanın maliyet gerekçesi yoktur; şablon Workers'a taşındı ki buradan türetilen her site
doğrudan Workers projesi olarak doğsun.

## Build output

```bash
bun run build
```

`dist/` doğrudan deploy edilecek düz statik dizindir: HTML sayfaları, `/_astro/*`, OG görselleri,
sitemap ve `robots.txt` aynı kök altında üretilir.

Build hook'u ile sürekli build alınacaksa `bun run build:incremental` kullanın: yalnızca
yeni/değişen yazılar işlenir, değişiklik yoksa build atlanır
(bkz. [incremental-build.md](./incremental-build.md)). Cloudflare/Vercel panelinde **Build
command** bu olmalı; GitHub Actions'ta hook'u `.github/workflows/build-hook.yml` karşılar.

## Deploy

```bash
bun run build
bunx wrangler deploy
```

`dist/` yolu ve Worker adı komuta DEĞİL `wrangler.toml` içine yazılıdır (`assets.directory` ve
`name`), o yüzden komut çıplaktır. Gerçekten deploy etmeden yapılandırmayı doğrulamak için
`bunx wrangler deploy --dry-run` yeterlidir.

`wrangler.toml` → `name` ŞABLON ADIDIR (`astro-template`): Workers'ta deploy hedefi bu addır,
Pages'teki gibi komut satırından verilmez. Türetilen sitede değiştirilmezse iki repo aynı
Worker'ı ezer. İlk deploy'dan önce adı ve bütün `PUBLIC_*` değerlerini gözden geçirin.

> Bu tam olarak bir kez yaşandı: şablonun adı `nafru-template` iken edumoodup onu devralmış ve
> Cloudflare'deki canlı projesi de o adı taşıyordu. Pages'te zararsızdı (proje adı komutta
> veriliyordu), Workers'ta ikisi aynı hedefe yazıyordu. Şablon tarafı yeniden adlandırıldı.

### If you wire it up from the Cloudflare dashboard

Cloudflare Workers Builds ya da kendi CI'ınızı kullanıyorsanız:

- **Build komutu:** `bun run build:incremental` (düz `bun run build` de çalışır; fark için bkz. [incremental-build.md](./incremental-build.md))
- **Deploy komutu:** `bunx wrangler deploy`
- **Asset dizini:** `dist` (`wrangler.toml` → `assets.directory`)
- **Node sürümü:** 22 veya üstü (`package.json` → `engines: node >=22.12.0`)
- Build ortamının **internet erişimi olmalı** (aşağıya bakınız).

## Build requires network access

`src/pages/og/[slug].png.ts` sosyal paylaşım görsellerini build zamanında üretir. Metni
çizmek için Inter fontunun **iki alt kümesini** bir CDN'den indirir:

```
https://cdn.jsdelivr.net/npm/@fontsource/inter@4.5.15/files/inter-latin-700-normal.woff
https://cdn.jsdelivr.net/npm/@fontsource/inter@4.5.15/files/inter-latin-ext-700-normal.woff
```

`latin-ext` **zorunludur**: Türkçeye özgü ş/ğ/ı/İ harfleri `latin` alt kümesinde yoktur.
Yalnızca `latin` yüklenirse OG görselleri eksik glif ile üretilir ve bu her sosyal
paylaşımda görünür — üstelik build **hata vermez**.

`node_modules` içindeki `@fontsource-variable/inter` paketi yalnızca `woff2` içerir ve
satori `woff2` okuyamaz; fontun ağdan çekilmesinin sebebi budur.

**Ağ erişimi olmayan bir CI ortamında build başarısız olur** (`OG font indirilemedi`).
Çözüm: iki `.woff` dosyasını depoya ekleyin ve `[slug].png.ts` içindeki `FONT_URLS` +
`loadFonts()` yerine `readFileSync` ile yerelden okuyun.

Fontla ilgili ikinci bir tuzak için: [troubleshooting.md → OG görsellerinde eksik
harf](./troubleshooting.md#og-görsellerinde-türkçe-harfler-eksik).

## Form provider and Turnstile configuration

Bu Astro projesi tamamen statiktir; Turnstile secret içermez ve token'ı kendisi doğrulamaz.
Tarayıcı token'ı seçilen sağlayıcıya yollar, sunucu tarafı doğrulamayı o sağlayıcı yapar.

Ortak public ayarlar `wrangler.toml` içindedir:

```toml
[vars]
PUBLIC_FORMS_PROVIDER = "custom" # custom | formspark | web3forms
PUBLIC_FORMS_ENDPOINT = "https://forms-api.example.com/v1/forms/example/contact"
PUBLIC_FORMS_ACCESS_KEY = ""
PUBLIC_TURNSTILE_SITE_KEY = "YOUR_PUBLIC_SITE_KEY"
PUBLIC_TURNSTILE_ACTION = "contact"
```

### Custom Worker

- `PUBLIC_FORMS_PROVIDER = "custom"`
- Endpoint Worker'ın tam `/v1/forms/<siteId>/<formId>` URL'sidir.
- Widget'ın secret'ı **form Worker'ında** siteye özel secret binding olarak tutulur. Örnek:
  `NAFRUCOM_TURNSTILE_SECRET_KEY` (`TURNSTILE`, `TURNSTALE` değil).
- `PUBLIC_TURNSTILE_ACTION`, Worker registry'sindeki `expectedTurnstileAction` ile eşleşir.
- Worker `{ "success": true, "submissionId": "…" }` döndürmeden arayüz başarı göstermez.

### Formspark

- `PUBLIC_FORMS_PROVIDER = "formspark"`
- Endpoint `https://submit-form.com/<form-id>` olur.
- Turnstile secret Formspark panelinde **Spam Protection → Turnstile** alanına girilir.
- `PUBLIC_FORMS_ACCESS_KEY` boş kalır.

### Web3Forms

- `PUBLIC_FORMS_PROVIDER = "web3forms"`
- Resmi `https://api.web3forms.com/submit` endpoint'i otomatik seçilir.
- `PUBLIC_FORMS_ACCESS_KEY` doldurulmalıdır; eksikse build açık hata verir.
- Turnstile Web3Forms Pro özelliğidir. Secret Web3Forms panelinde captcha provider olarak
  Turnstile seçilerek kaydedilir. Ücretsiz kullanımda bu doğrulamaya güvenmeyin.
- Web3Forms yalnız JSON gövdesindeki `success: true` ile başarılı sayılır.

Her üç sağlayıcıda da `cf-turnstile-response` zorunludur. Custom payload ayrıca honeypot ve
form başlangıç zamanını, Formspark `_gotcha` honeypot'unu taşır. Provider'a ait access key veya
metadata diğer sağlayıcıların payload'ına sızdırılmaz.

## The `site` field must be correct

`astro.config.mjs` → `site` build zamanında kanonik URL'leri, hreflang'leri, `og:url`,
`og:image`, sitemap `<loc>` değerlerini ve RSS bağlantılarını üretir. Yanlış bırakılırsa
build hata **vermez**, site yayına çıkar ve arama motorlarına `example.com` adresini
gösterir. Üç yeri birlikte güncelleyin — ayrıntı
[configuration.md](./configuration.md#the-site-field).

## What runs on the server

Bu repo `output: 'static'` üretir; içinde istek anında çalışan form endpoint'i yoktur. Custom
form Worker'ı ayrı deploy edilir. Formspark ve Web3Forms kullanıldığında onların API'lerine
doğrudan tarayıcıdan istek atılır.

## CI

`.github/workflows/ci.yml` `main`'e push ve her pull request'te koşar:

```
bun install --frozen-lockfile
bun run check                                              # tip denetimi
bun run test                                                   # vitest
bun run build                                              # derleme
bun install --frozen-lockfile  (working-directory: scripts/create-cli)            # sihirbazın kendi bağımlılıkları
node scripts/create-cli/index.mjs "$RUNNER_TEMP/en" --yes --all --lang=en   # sihirbazla proje üret
bun run test:removal                                       # çıkarma matrisi (14 kombinasyon, makineye göre 4-7 dk)
```

Sıra bilinçli: en ucuz ve en hızlı geri bildirim veren adım önce, en pahalısı en sonda.
Sihirbaz adımı üretilen projede kendi `check` + `test` + `build` doğrulamasını koşturur, yani
tek adımda İngilizce üretim yolunun tamamı sınanır; İngilizce mod seçilir çünkü en çok
mekanizma orada çalışır (park + çıkarma + yeniden etiketleme + slug'lar). Node sürümü `22`;
yükseltmeden önce `package.json` → `engines` alanını güncelleyin.

Sihirbaz adımı ayrıca dört ortam değişkeni taşır:

```yaml
env:
  GIT_AUTHOR_NAME: create-nafru-landing CI
  GIT_AUTHOR_EMAIL: ci@example.com
  GIT_COMMITTER_NAME: create-nafru-landing CI
  GIT_COMMITTER_EMAIL: ci@example.com
```

Sebebi: sihirbaz üretilen projede `git init` + `git commit` yapıyor ve runner'da **global**
bir git kimliği yok (`actions/checkout` yalnızca depo-yerel ayar yazar). Kimlik verilmezse
commit _"Please tell me who you are"_ ile düşer ve adım kırmızıya döner. `--no-git` ile
atlamak yerine kimliği ortamdan vermek, git adımının da gerçekten sınanmasını sağlar.

Matris 10 özelliğin 1023 alt kümesinden 14'ünü koşar. Yeşil CI "sınanan kombinasyonlar
sağlam" demektir, "her kombinasyon sağlam" değil.

CI ortamı font CDN'ine erişebilmelidir (yukarıya bakınız).

## Pre-deploy checklist

Sonunda özellik adı yazan maddeler yalnızca o özellik projenizde duruyorsa geçerlidir.

- [ ] `wrangler.toml` → `PUBLIC_SITE_URL` gerçek canonical origin; `dist/robots.txt`, sitemap ve
      canonical etiketler aynı host'u gösteriyor.
- [ ] `PUBLIC_FORMS_PROVIDER` ve ilgili endpoint/access key seçilen sağlayıcıya göre dolduruldu.
      _(`forms`)_
- [ ] `PUBLIC_TURNSTILE_SITE_KEY` gerçek site key; `PUBLIC_TURNSTILE_ACTION` Worker/provider
      ayarıyla aynı. _(`forms`)_
- [ ] Custom sağlayıcıda site origin'i, form kimliği ve `*_TURNSTILE_SECRET_KEY` ayrı Worker'ın
      registry/secrets yapılandırmasına eklendi. Secret bu statik repoya yazılmadı. _(`forms`)_
- [ ] Canlı formda başarı, sahte Turnstile token'ında ret, honeypot ve rate-limit yolları test
      edildi. _(`forms`)_
- [ ] `siteConfig.newsletterAction` dolduruldu. _(`newsletter`)_
- [ ] [SEO checklist](./seo-checklist.md) tamamlandı.
- [ ] [Analytics checklist](./analytics.md) seçilen sağlayıcı için tamamlandı. _(`analytics`)_
- [ ] `src/data/<dil>/privacy.ts` içindeki yer tutucu metin gerçek gizlilik politikasıyla
      değiştirildi.
- [ ] `public/logo.svg` ve `public/favicon.svg` değiştirildi.
- [ ] `bun run check && bun run test && bun run build` yeşil.
