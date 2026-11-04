# Koina web uygulaması (`apps/app`)

TanStack Start (React 19, SSR) ile yazılmış, Cloudflare Workers'ta `koina-app` adıyla çalışan topluluk uygulaması.
Tasarım ve kararlar: `docs/platform.md`. API sözleşmesi: `packages/shared/src/api.ts`.

## Çalıştırma

```sh
cp .dev.vars.example .dev.vars   # bir kez
bun run dev:api                  # kökten; API 127.0.0.1:8787'de
bun run dev:app                  # kökten; uygulama localhost:5173'te (port sabit, API'nin köken listesinde)
```

Geliştirmede giriş sayfası e-posta yerine `GET /v1/dev/otp`'den okunan kodu gösterir; Turnstile Cloudflare'in test anahtarıyla çalışır.

| Komut | İş |
|---|---|
| `bun run check` | `tsc --noEmit` |
| `bun run test` | Vitest (saf yardımcılar: `src/lib/*.test.ts`) |
| `bun run build` | `dist/client` (statik) + `dist/server` (Worker) |
| `bun run deploy` | build + `wrangler deploy` (kökten `bun run deploy:app`) |

## Nasıl çalışır

- **Giriş noktası** `src/server.ts`: `/api/*` isteklerini API'nin `/v1/*` uçlarına aktarır, kalanı Start'a verir ve HTML yanıtlarına
  güvenlik başlıklarını ekler.
- **Vekil** (`src/lib/server/proxy.server.ts`): tarayıcı API'yi hep kendi kökünden çağırır, oturum çerezi birinci taraf kalır.
  Canlıda `API` servis bağlantısı (`koina-api`), `API_URL` tanımlıysa (yerel) o adres kullanılır. Yöntem, gövde, çerez, `origin`,
  `content-type`, `authorization`, `x-captcha-response`, `cf-connecting-ip` aktarılır; durum, gövde ve `set-cookie` geri döner.
- **SSR**: rotaların yükleyicileri veriyi sunucuda TanStack Query önbelleğine doldurur (gelen çerez API'ye aktarılır, girişli
  üyenin sayfası kişisel oluşur); önbellek sayfayla tarayıcıya iner (`@tanstack/react-router-ssr-query`).
- **SEO** (`src/lib/seo.ts`): her rota başlık, açıklama, kanonik, Open Graph, Twitter ve JSON-LD üretir. `/sitemap.xml`
  (`GET /v1/sitemap`; profiller yok) ve `/robots.txt`. Profiller, giriş ve kişisel sayfalar `noindex`.
- **CSP**: istek başına nonce; Start'ın satır içi betikleri ve `<meta property="csp-nonce">` aynı nonce'u taşır. Turnstile için
  `challenges.cloudflare.com` açık. Ayrıca `frame-ancestors 'none'`, HSTS (https), `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Kullanıcı metni hiçbir yerde HTML olarak basılmaz; gönderide bağlantı, `#etiket` ve `@anma` ortak desenlerle ayrılır.
  Blog markdown'ı sitenin kendi içeriğidir, sunucuda `marked` ile çevrilir.

## Ortam değişkenleri (`wrangler.jsonc` → `vars`, yerelde `.dev.vars`)

| Ad | Varsayılan | İş |
|---|---|---|
| `APP_URL` | `https://koina-app.0furkancolak.workers.dev` | Kanonik adres ve site haritası kökü |
| `SITE_URL` | `https://koina-site.0furkancolak.workers.dev` | Blog beslemesi, takvim aboneliği |
| `TURNSTILE_SITE_KEY` | `1x00000000000000000000AA` (test) | Giriş kodu isteğindeki Turnstile |
| `API_URL` | yok | Tanımlıysa vekil servis bağlantısı yerine buraya gider |
| `ENVIRONMENT` | `production` | `development` iken geliştirme kodu gösterilir, CSP gevşer (HMR) |
