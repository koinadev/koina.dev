# Koina

Fikri imeceyle büyüten, açık kaynağa destek olan bir topluluk. Bu depo Koina'nın web sitesini,
API'sini ve mobil uygulamasını tek bir bun monorepo'sunda tutar.

```
apps/
  web/      koina.dev — Astro, Cloudflare Workers statik varlıkları
  api/      Koina API — Hono + Cloudflare Workers, Postgres (Neon + Hyperdrive), Better Auth
  app/      Koina web uygulaması — TanStack Start (SSR), Cloudflare Workers
  mobile/   Koina uygulaması — Expo (SDK 58), Expo Router
packages/
  db/       veritabanı: migration'lar, SQL sorguları, repository'ler (db-single kopyası)
  shared/   ortak marka sabitleri, API şemaları (zod), canlı yayın takvimi
docs/
  platform.md   platformun tasarımı: akış, sıralama, moderasyon, SEO, güvenlik
```

İçerik tek kaynaktan gelir: sayfalar, SSS ve bağlantılar `apps/web/src/messages/` altında; mobil
uygulama aynı içeriği `@koina/web/content` üzerinden okur. Renkler ve logo
`@koina/shared/brand`, API sözleşmesi `@koina/shared/api`.

## Kurulum

Bun 1.4+ ve Node 22.12+ gerekir.

```bash
bun install
```

Kurulum kökteki tek `node_modules`a yapılır (`bunfig.toml` → `linker = "hoisted"`; Expo/Metro
izole kurulumla paketleri bulamıyor).

## Geliştirme

`make dev` tek komutla Postgres'i, API'yi, web uygulamasını ve siteyi birlikte açar; tüm hedefler
için `make help`.

| Komut | Ne yapar |
| --- | --- |
| `bun run dev:web` | Siteyi açar: http://localhost:4321 |
| `bun run infra:up` | Yerel Postgres + PgBouncer (Docker) |
| `bun run dev:api` | Migration'ları uygular, API'yi açar: http://localhost:8787 |
| `bun run seed` | Yerel veritabanına örnek veri (uydurma üyeler, gönderiler, bağlantılar) |
| `bun run dev:app` | Web uygulaması: http://localhost:5173 |
| `bun run dev:mobile` | Expo geliştirme sunucusu (iOS simülatörü için `i`) |
| `bun run check` | Tüm paketlerde tip denetimi |
| `bun run test` | Tüm paketlerde testler |

API'yi yerelde açmadan önce bir kez: `cp apps/api/.dev.vars.example apps/api/.dev.vars`.
Mobil uygulamayı yerel API'ye bağlamak için: `cp apps/mobile/.env.example apps/mobile/.env.local`.
Geliştirme modunda e-posta gönderilmez; giriş kodu ekranda gösterilir (`GET /v1/dev/otp`).
API testleri yerel Postgres ister: önce `bun run infra:up`.

## Yayına alma

- **Site:** `bun run deploy:web` (ya da `v*.*.*` etiketiyle GitHub Actions). Ayrıntı:
  [apps/web/README.md](apps/web/README.md).
- **API:** ilk kurulum adımları [apps/api/README.md](apps/api/README.md) içinde; sonrasında
  `bun run deploy:api`.
- **Mobil:** EAS ile derlenir: [apps/mobile/README.md](apps/mobile/README.md).

## Lisans

AGPL-3.0. Şablondan gelen dosyaların orijinal MIT bildirimi `LICENSES/MIT-astro-template.txt`
içinde. Koina adı ve logosu için [TRADEMARK.md](TRADEMARK.md).
