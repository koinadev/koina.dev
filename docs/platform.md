# Koina platformu: tasarım ve plan (2. sürüm)

Tarih: 2026-10-26. Kapsam: API (`apps/api`), web uygulaması (`apps/app`), mobil uygulama (`apps/mobile`),
ortak sözleşme (`packages/shared`) ve yeni veritabanı paketi (`packages/db`). Landing (`apps/web`) yalnız
bağlantı ve metin düzeyinde etkilenir.

## İstekler

1. Topluluk sayıları (üye sayısı, proje sayısı, "bu hafta" vb.) her yerden kalkar.
2. Akış X'e (Twitter) benzer biçimde daha özellikli olur.
3. Bot, küfür ve benzeri içerik ayıklanır; kaldırılır.
4. Akışta neyin öne çıkacağını bir sıralama algoritması belirler.
5. SEO önemli; web uygulaması sunucu tarafında oluşturulur (TanStack Start).
6. Güvenlik çok önemli.
7. Veritabanı ve kimlik: nafru-email'deki `db-single` + Better Auth; D1 ya da Neon Postgres seçimi bize bırakıldı.
8. Üyelerin buldukları araçları ve kaynakları paylaştığı bir **Faydalı bağlantılar** bölümü.

## Kararlar

| Konu | Karar | Neden |
|---|---|---|
| Veritabanı | **PostgreSQL**: canlıda Neon, Workers'tan Hyperdrive (önbellek kapalı) ile; yerelde Docker (Postgres 16 + PgBouncer, `466xx` portları) | `db-single` yalnız Postgres'le çalışır ve Better Auth bağdaştırıcısı hazır gelir; nafru-email ile aynı araç zinciri. Barındırma yine tamamen Cloudflare (Workers, Hyperdrive, R2, Turnstile, Workers AI); yalnız veri Neon'da. |
| Veri erişimi | `packages/db` = nafru-email'deki `db-single` kopyası (`@koina/db`). ORM yok; SQL dosyaları + codegen, yalnız hazırlanmış sorgu | Dinamik SQL olmadığı için SQL enjeksiyonu yapısal olarak kapalı. |
| Kimlik | **Better Auth 1.7.5** (db-single'ın sabitlediği sürüm), `/v1/auth/*`. E-posta kodu (`emailOTP`, kod özetlenerek saklanır), mobilde `bearer`, oturumlar veritabanında, hız sınırı veritabanında | Şifresiz giriş deneyimi aynı kalır; oturum yönetimi, kod denemesi sınırı ve CSRF denetimi hazır gelir. |
| Web uygulaması | **TanStack Start** (React 19, SSR) Cloudflare Workers'ta (`@cloudflare/vite-plugin`). API'ye kendi kökünden `/api/*` vekiliyle gider | SEO için sunucuda oluşturulan sayfalar; çerezler birinci taraf kalır (workers.dev alt alanları ayrı site sayılır, üçüncü taraf çerez Safari'de çalışmaz). |
| Görseller | Cloudflare R2 (`MEDIA`), API `GET /media/<anahtar>` ile sunar | Ek servis yok; içerik tipi ve boyutu sunucuda denetlenir. |
| Yapay zekâ denetimi | Workers AI Llama Guard, **isteğe bağlı** (`AI_MODERATION=on`) | Kelime listesinin kaçırdığını yakalar; kapalıyken kurallar yine çalışır. |

## Veri modeli (özet)

Better Auth tabloları (`users`, `session`, `account`, `verification`, `rate_limit`) paketle gelir; `users`
tablosuna profil sütunları eklenir: `handle` (tekil), `bio`, `roles text[]`, `interests text[]`,
`github`, `website`, `location`, `locale`, `role` (`member` | `moderator` | `admin`), `trust`
(0 yeni, 1 olağan, 2 güvenilir), `banned_at`.

| Tablo | İçerik |
|---|---|
| `projects`, `project_members` | Önceki gibi |
| `posts` | `parent_id` (yanıt, artık iç içe), `root_id` (konu), `quote_id` (alıntı), `link_url` + `link_hash` (ilk bağlantı), `status` (`visible` \| `hidden` \| `removed`) |
| `post_media` | Gönderi görselleri (en çok 4): R2 anahtarı, tür, boyut, alt metin |
| `post_tags`, `post_mentions` | `#etiket` ve `@kullanıcı` |
| `claps`, `reposts`, `bookmarks` | Alkış, yeniden paylaşım, kaydetme |
| `follows` | Takip (yalnız sayılar herkese açık; takipçi listesi yok) |
| `notifications` | Yanıt, anma, alıntı, yeniden paylaşım, alkış, takip |
| `link_previews` | Bağlantı kartı önbelleği (og:title, açıklama, görsel) |
| `links`, `link_votes` | Faydalı bağlantılar ve "işe yarar" oyları |
| `reports`, `moderation_log` | Şikâyetler ve moderasyon kaydı |
| `events`, `rsvps`, `submissions`, `subscribers`, `hits`, `api_rate_limits` | Önceki gibi |

## Akış

- **Sekmeler:** *Öne çıkanlar* (algoritmik, varsayılan), *Takip* (takip edilenler ve onların yeniden paylaşımları, zaman sırası), *Son* (zaman sırası).
- **Gönderi:** 500 karakter, en çok 4 görsel (alt metinli), bağlantı kartı, `#etiket` ve `@anma` bağlantılı, alıntı ve yeniden paylaşım, kaydet, paylaş, şikâyet et, sil.
- **Konu:** yanıtlar iç içe olabilir; gönderi sayfası üst zinciri, gönderiyi ve yanıtları gösterir.
- **Etiketler:** etiket sayfası ve son 7 günün gündemdeki etiketleri.
- **Bildirimler:** okunmamış sayısıyla birlikte.

### Sıralama algoritması

Aday küme: son 7 gün içindeki görünür ana gönderiler (en çok 400). Puan TypeScript'te hesaplanır (`apps/api/src/lib/ranking.ts`, birim testli):

```
etkileşim = alkış + 2·(farklı yanıtlayan) + 3·yeniden paylaşım + 2·alıntı + kaydetme
temel     = 1 + ln(1 + etkileşim)
çarpanlar = takip ettiğin yazar ×1,6 · ekibinde olduğun proje ×1,3 · projeye bağlı ×1,1
            · görsel ya da bağlantı kartı ×1,05 · yeni hesap (trust 0) ×0,7 · çözülmemiş şikâyet ×0,4
yaş       = (saat + 2)^1,5
puan      = temel · çarpanlar / yaş
```

Ardından çeşitlilik: aynı yazarın listedeki her yeni gönderisi ×0,6 ile çarpılır (bir kişi akışı dolduramaz).
Sayfalar bir anlık görüntü zamanı ve sıra numarasıyla imlenir; istemci aynı kimliği iki kez göstermez.

## Moderasyon ve bot önleme

1. **Kelime süzgeci** (`apps/api/src/lib/moderation/`): Türkçe ve İngilizce liste; büyük-küçük harf, Türkçe harf,
   leetspeak (`4→a`, `3→e`, `1→i`, `0→o`, `5→s`, `@→a`, `$→s`), yinelenen harf ve harf arası noktalama sadeleştirilerek
   eşleşir; kelime sınırıyla çalışır ki "amca", "sıkıntı" gibi masum kelimeler yakalanmasın. Gönderi, yanıt, profil
   (ad, biyografi), proje ve bağlantı metinlerinde uygulanır; eşleşen içerik `CONTENT_REJECTED` ile reddedilir.
2. **Spam kuralları:** aynı metni 24 saat içinde yeniden gönderme yok; yeni hesaplar (trust 0) gönderide en çok 1
   bağlantı, saatte 5 gönderi; diğerleri 2 bağlantı ve saatte 30 gönderi. Hesap açılışında e-posta kodu + web'de Turnstile.
3. **Şikâyet:** üye bir gönderiyi ya da bağlantıyı gerekçeyle şikâyet eder. 3 farklı güvenilir üye (trust ≥ 1) ya da 5
   farklı üye şikâyet ederse içerik kendiliğinden gizlenir ve moderatör kuyruğuna düşer.
4. **Yapay zekâ (isteğe bağlı):** `AI_MODERATION=on` iken gönderi yanıttan sonra Llama Guard'a sorulur; güvensizse gizlenir, kayda geçer.
5. **Moderatör:** `role` moderator/admin olan üye şikâyet kuyruğunu görür; gizler, geri açar, kaldırır, üyeyi
   uzaklaştırır (oturumları silinir, içeriği gizlenir). Her işlem `moderation_log`'a yazılır.

## Faydalı bağlantılar

Üye bir adres yapıştırır; sunucu sayfanın başlığını, açıklamasını ve görselini çeker (SSRF korumalı). Üye metni düzeltir,
kategori seçer (Araç, Kütüphane, Öğrenme, Tasarım, Yapay zekâ, Diğer), en çok 3 etiket ekler. Aynı adres (izleme
parametreleri ve parça atılarak) iki kez eklenemez; var olana yönlendirilir. Liste *Öne çıkan* (oy ve yaşla) ve *Yeni*
sıralanır, kategoriye göre süzülür. Her bağlantının kendi sayfası vardır.

## SEO

- Herkese açık sayfalar sunucuda oluşturulur: gönderi, proje, bağlantı, etiket, keşfet, bağlantılar, akış.
- Her sayfada başlık, açıklama, kanonik adres, Open Graph ve Twitter etiketleri; JSON-LD (`SocialMediaPosting`,
  `SoftwareSourceCode`, `WebPage`, `BreadcrumbList`).
- `/sitemap.xml` (projeler, son gönderiler, bağlantılar) ve `/robots.txt`.
- **Profiller `noindex`** ve site haritasında yok: üye listesi herkese açık olmasın kararıyla tutarlı.
  Giriş, profil düzenleme, kaydedilenler, bildirimler de `noindex`.
- Kullanıcı bağlantıları `rel="ugc nofollow noopener noreferrer"`.

## Güvenlik

- Oturum çerezi `HttpOnly`, `Secure` (https'te), `SameSite=Lax`; Better Auth köken denetimi açık, güvenilen kökenler listeli.
- Mobil Bearer belirteci SecureStore'da; API CORS izin listesi; her girdi zod ile doğrulanır.
- SQL yalnız hazırlanmış sorgu (db-single bunu zorunlu kılar).
- Hız sınırları Postgres'te: giriş kodu, gönderi, şikâyet, yükleme, bağlantı ekleme.
- Görsel yükleme: yalnız JPEG, PNG, WebP, GIF; sihirli baytlarla tür denetimi, 5 MB, SVG yok; sunarken
  `nosniff`, `Content-Security-Policy: default-src 'none'`.
- Bağlantı önizlemesi: yalnız `https`/`http`, IP adresi ve yerel ad yok, en çok 3 yönlendirme, 4 sn, 512 KB.
- Web uygulaması başlıkları: CSP, `frame-ancestors 'none'`, HSTS, `Referrer-Policy`, `Permissions-Policy`.
- Uzaklaştırılmış üye yazamaz; oturumları silinir.
- Gizli değerler yalnız `wrangler secret` ile; `.dev.vars` ve `.env.local` depoya girmez.

## Üye eşiğiyle açılan özellikler

Eşikler `packages/shared/src/features.ts` içindedir: bağlantılar 25, akış 50, takip 100, projeler 200, sezonlar 500, mobil 1000.
Sayılan üye: e-postası doğrulanmış, uzaklaştırılmamış hesap. API eşik geçilince özelliği `feature_unlocks` tablosuna yazar; sayı
sonradan düşse de özellik kapanmaz. Kilitli uçlar `403 FEATURE_LOCKED` döner. `GET /v1/features` yalnız aç/kapa bilgisini verir,
güncel üye sayısı yalnız `GET /v1/admin/members` ile okunur. `FEATURE_GATES=off` eşikleri yok sayar (yerel geliştirme, testler).

## Giriş kapısı

`koina.dev` alan adı `koina-app` Worker'ına bağlanır (`apps/app/src/server.ts`). `/`, `/tr` ve `/en`: geçerli oturum varsa `/home`,
yoksa tanıtım sitesi. Uygulama rotaları (`lib/front-door.ts`) uygulamada çalışır, geri kalan yollar `SITE` servis bağlantısıyla
`koina-site` Worker'ına aktarılır. Site ayrı adresinden doğrudan açılırsa oturumu göremez; bu yüzden herkese açık adres tek olmalıdır.

## Kaldırılanlar

- `GET /v1/stats` ve `CommunityStats`; mobil ana sayfadaki "Topluluk" kutuları; web uygulamasındaki topluluk sayıları.
- D1 ve `apps/api/migrations/*.sql` (yerini `packages/db/src/migrations` alır). Eski oturumlar geçersiz olur; canlıda
  henüz kullanıcı olmadığı için veri taşıma yok.

## Uygulama sırası

1. `packages/db` (db-single kopyası), Docker altyapısı, migration'lar, sorgular.
2. API: Better Auth, Postgres'e taşıma, akış özellikleri, sıralama, moderasyon, bağlantılar, görseller; testler (`bun test`, gerçek Postgres).
3. Ortak sözleşme (`packages/shared/src/api.ts`) 2. sürüm.
4. Web uygulaması: TanStack Start'a taşıma, SSR, SEO, yeni ekranlar.
5. Mobil: yeni giriş, akış özellikleri, bağlantılar, bildirimler; topluluk sayıları kalkar.
6. Denetim: tip, lint, testler; tarayıcıda ve simülatörde elle deneme.

## Bu sürümde olmayanlar

GitHub ile giriş, mobilde Turnstile (App Attest/Play Integrity), anket, gönderi düzenleme, doğrudan mesaj,
görsellerde otomatik içerik denetimi, tam metin arama dizini (`pg_trgm`); şimdilik arama sadeleştirilmiş `ILIKE` ile.
