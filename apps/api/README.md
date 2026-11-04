# apps/api — Koina API

Cloudflare Worker (Hono). Veri Postgres'te (canlıda Neon, Worker'dan Hyperdrive ile), görseller R2'de, kimlik Better Auth.
Sözleşme `@koina/shared/api`; veri erişimi `@koina/db` (db-single: SQL dosyaları + codegen, ORM yok). Tasarım: `docs/platform.md`.

## Düzen

```
src/app.ts                 ara katmanlar ve modüllerin bağlandığı yer
src/core/                  ortak altyapı: veritabanı, Better Auth, oturum, CORS/CSRF, hatalar, hız sınırı
src/modules/<modül>/
  routes/                  HTTP yüzeyi: doğrulama ve service çağrısı, iş kuralı yok
  service/                 kullanım senaryosu başına bir dosya (create-post, report-content …)
  domain/                  saf iş kuralları: sıralama, içerik süzgeci, adres güvenliği, görsel türü
  utils/                   satır → sözleşme eşleyicileri
packages/db/src/repositories/<modül>/   sorgu başına bir fonksiyon (src/queries/*.sql'den)
```

| Uç | Ne yapar |
| --- | --- |
| `/v1/auth/*` | Better Auth: e-posta koduyla giriş, oturum, çıkış (web çerez, mobil Bearer) |
| `GET/PATCH/DELETE /v1/me` · `/me/bookmarks` · `/me/notifications` | Hesap, kaydedilenler, bildirimler |
| `GET /v1/members/:handle` · `/follow` · `/report` | Profil (üye listesi yok), takip, şikâyet |
| `GET/POST /v1/feed` · `/:id` · `/:id/{clap,repost,bookmark,report}` | Akış (öne çıkanlar, takip, son), konu, etkileşim |
| `GET /v1/tags/trending` | Gündemdeki etiketler |
| `POST /v1/media` · `GET /media/<anahtar>` | Görsel yükleme (meta veri çıkarılır) ve sunum |
| `/v1/links` | Faydalı bağlantılar: liste, önizleme, ekleme, oy, şikâyet |
| `/v1/projects`, `/v1/events` | Projeler ve ekip, takvim ve katılım |
| `/v1/mod/{queue,actions,log}` | Moderatör kuyruğu ve işlemler |
| `GET /v1/sitemap` | Web uygulamasının site haritası verisi |
| `/v1/forms`, `/v1/newsletter`, `/v1/analytics` | Sitenin formları, bülten, çerezsiz sayaç |
| `/v1/admin/*` | Yönetici uçları (`ADMIN_TOKEN`), moderatör atama dahil |

Hata gövdesi `{ "success": false, "code": "…" }` (Better Auth uçları `{ code, message }`).

## Yerel geliştirme

```bash
bun run --filter @koina/db infra:up     # Postgres + PgBouncer (Docker, 466xx portları)
cp apps/api/.dev.vars.example apps/api/.dev.vars
bun run dev:api                         # migration'lar + wrangler dev, http://localhost:8787
bun run --filter @koina/api seed        # yalnız yerel: örnek üyeler, projeler, gönderiler, bağlantılar
bun run --filter @koina/api test        # süreç içinde uygulama, gerçek Postgres (koina_test)
```

Giriş kodu geliştirmede e-postaya gitmez: `GET /v1/dev/otp?email=…` son kodu verir (yalnız `ENVIRONMENT=development`).

## İlk yayın

```bash
# Neon'da proje aç, doğrudan bağlantı adresini al (NEON_URL)
DATABASE_URLS=$NEON_URL bun run --filter @koina/db db:migrate
bunx wrangler hyperdrive create koina --connection-string="$NEON_URL" --caching-disabled   # kimliği wrangler.toml'a
bunx wrangler r2 bucket create koina-media
bunx wrangler secret put BETTER_AUTH_SECRET     # en az 32 karakter rastgele
bunx wrangler secret put TURNSTILE_SECRET
bunx wrangler secret put RESEND_API_KEY
bunx wrangler secret put ADMIN_TOKEN
bunx wrangler secret put HASH_SALT
bun run deploy:api
```

`RESEND_API_KEY` olmadan üretimde giriş kodu gönderilemez (503). İlk moderatörü atamak:
`curl -X POST $API/v1/admin/members/<kullanıcı>/role -H "authorization: Bearer $ADMIN_TOKEN" -H 'content-type: application/json' -d '{"role":"moderator"}'`.
Yapay zekâ denetimi isteğe bağlı: `AI_MODERATION = "on"` (Workers AI, Llama Guard).
