# Incremental build (build hook)

Build hook'u her yeni ya da değişen blog yazısında tetikleniyor ve bazen üst üste geliyor. Her
tetikte tüm sitenin sıfırdan işlenmesi yerine **yalnızca yeni ve değişen yazılar için iş
yapılır**, gerisi önbellekten gelir.

> Astro statik üretimde HTML'i her build'de yeniden yazar (liste sayfaları, RSS ve sitemap zaten
> her yeni yazıyla değişir). Artımlı olan, **pahalı adımlardır**: OG PNG üretimi (satori +
> resvg + font indirme) ve `.md` ikizi çıkarımı (sayfa başına happy-dom ayrıştırması). Görsel
> optimizasyonu Astro'nun kendi önbelleğiyle (`node_modules/.astro`) zaten artımlıdır.

## Hook'ta hangi komut

```bash
bun run build:incremental
```

| Bayrak            | Etki                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `--dry-run`       | Yalnızca planı yazar (yeni/değişen/silinen yazılar); build etmez                          |
| `--force`         | Karşılaştırmayı atlar, her koşulda build eder                                             |
| `--clear-cache`   | Önbelleği ve son-build kaydını siler, sıfırdan başlar                                     |
| `--no-dist-check` | `dist/`in kalıcı olmadığı ortamlarda (GitHub Actions) atlamayı `dist/` varlığına bağlamaz |

Çıktı örneği:

```
▶ build gerekli: yazılar değişti (+1 ~1 -0)
  + yeni      tr/deneme-yazisi
  ~ değişti   tr/hosgeldiniz
  = 3 yazı değişmedi (önbellekten gelir)
...
[build-cache] Build önbelleği — og: 5 önbellekten, 1 yeniden üretildi · markdown: 13 önbellekten, 2 yeniden üretildi
```

Düz `bun run build` de önbelleği kullanır; `build:incremental` buna **karar, sıra ve atlama**
ekler.

## Hangi ortamda nasıl bağlanır

Komut her yerde aynı (`bun run build:incremental`); fark, build'ler arasında **ne saklandığı**.
Önbellek ve son-build kaydı `node_modules/.astro/nafru-build/` altında, çünkü barındırıcıların
"framework önbelleği" tam olarak Astro'nun `node_modules/.astro` dizini.

| Ortam                           | Build komutu                | Neyin saklandığı                                                                                     | Sonuç                                                                      |
| ------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Cloudflare** (Workers Builds) | `bun run build:incremental` | Paket yöneticisi önbelleği + `node_modules/.astro` ([build caching][cf-cache]); `dist/` saklanmaz    | OG/markdown önbellekten gelir; `dist/` olmadığı için build her zaman koşar |
| **Vercel**                      | `bun run build:incremental` | `node_modules/**` + framework dosyaları, dal başına ([build cache][vercel-cache]); `dist/` saklanmaz | Aynı: önbellek çalışır, build atlanmaz                                     |
| **GitHub Actions**              | `build-hook.yml` (aşağıda)  | `actions/cache` ile `node_modules/.astro`                                                            | Önbellek çalışır **ve** değişiklik yoksa build + deploy atlanır            |

[cf-cache]: https://developers.cloudflare.com/workers/ci-cd/builds/build-caching
[vercel-cache]: https://vercel.com/docs/deployments/troubleshoot-a-build#understanding-build-cache

Cloudflare/Vercel'de build'i atlamanın anlamı yok: platform kendi deploy adımını `dist/`ten
yapar ve `dist/` her build'de sıfırdan başlar. Orada kazanç **build süresinin kısalması**dır
(satori/resvg/happy-dom işleri ve font indirmesi atlanır). Cloudflare/Vercel panelinde
tek ayar: **Build command** = `bun run build:incremental`.

### GitHub Actions: `.github/workflows/build-hook.yml`

Hook'u GitHub'a bağlayan iş akışı. İki tetikleyicisi var: `repository_dispatch` (dış sistem,
hook) ve `workflow_dispatch` (elle, `force` seçeneğiyle).

```bash
curl -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/<sahip>/<repo>/dispatches \
  -d '{"event_type":"build-hook"}'
```

Karşılaştırmayı atlayıp her koşulda build için `event_type` olarak `build-hook-force` gönderin.

`GITHUB_TOKEN` burada o repoya `contents: write` yetkili bir fine-grained PAT (ya da GitHub App
token'ı) olmalı. Gerekli depo secret'ları `release.yml` ile aynı: `CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID`.

Akış: `bun install` → önbelleği geri yükle → `build:incremental --no-dist-check` → **yalnızca
`built=true` ise** `wrangler deploy` → **yalnızca deploy başarılıysa** önbelleği kaydet.

- **Sıra:** `concurrency: build-hook`, `cancel-in-progress: false`. GitHub bir grupta tek
  _bekleyen_ koşu tutar; yeni tetik gelince eski bekleyeni iptal eder. Bu istenen davranış:
  bekleyen koşu checkout'u kendi başladığında alır ve aradaki tüm yazıları görür.
- **Neden kayıt deploy'dan sonra saklanıyor:** build geçip deploy düşerse kayıt saklanmaz,
  sonraki tetik yeniden build edip yeniden dağıtır. Aksi halde "yayında" sanılan ama
  yayında olmayan bir sürüm kalıcı olurdu.
- **Neden `--no-dist-check`:** runner'da `dist/` her koşuda sıfırdan başlar. Kayıt "en son
  yayınlanan çıktı"yı temsil eder; girdiler aynıysa yayındaki site zaten günceldir ve deploy
  edilecek bir şey yoktur. Çıktı özeti iş akışı sayfasında (Summary) görünür.
- Önbellek GitHub'da 7 gün erişilmezse silinir; o zaman sıradaki koşu tam build + deploy yapar.

## Ne yapar

1. **Tek build, sıra bekler.** `node_modules/.astro/nafru-build/build.lock` ile aynı anda tek
   build koşar. Beklerken gelen tetikler kendi sırası geldiğinde yeniden karar verir; yani
   arka arkaya 5 tetik, ilk build bitince "girdiler aynı" ile atlanır. Çöken build'in kilidi
   (ölü pid) devralınır.
2. **Parmak izi.** `src/`, `public/`, `content/`, `astro.config.mjs`, `wrangler.toml`,
   `package.json`, `bun.lock`, `tsconfig.json` okunur. Yazılar (`content/blog/<dil>/<slug>/**`,
   görselleri dahil) tek tek, geri kalan her şey tek bir `siteHash` olarak özetlenir.
   `docs/`, `scripts/` ve testler hash'e girmez: bunlar sitenin çıktısını etkilemez.
3. **Karar.** Son _başarılı_ build ile karşılaştırılır. Build edilir: ilk build, `--force`,
   `siteHash` değişti, yazı eklendi/değişti/silindi, `dist/` yok ya da build'den sonra
   değişmiş, **ya da uzak blog kaynağı tanımlı** (yeni yazılar diskte görünmez, değişiklik
   denetlenemez). Aksi halde atlanır.
4. **Kayıt yalnızca başarıda yazılır.** Düşen build bir sonraki tetikte yeniden denenir.
   Parmak izi build'den _önce_ alınır: build sırasında eklenen yazı sonraki turda yakalanır.

## Önbellek

`src/lib/build-cache.ts`: içerik adresli (anahtar girdinin hash'i), `node_modules/.astro/nafru-build/`
altında. Ayrı bir "değişenler listesi" tutulmaz; yeni yazı otomatik MISS, dokunulmayan yazı
otomatik HIT olur.

| Ad alanı   | Üretici                             | Anahtar                                                                         |
| ---------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| `og`       | `src/pages/og/[slug].png.ts`        | şablon dosyasının içeriği + font URL'leri + boyut + site adı + başlık + altyazı |
| `markdown` | `src/integrations/page-markdown.ts` | ayıklayıcı kodunun içeriği + sayfanın HTML'i + varsa blog kaynak dosyası        |

- **Kod değişirse önbellek kendiliğinden geçersiz olur** (üretici dosyaların içeriği anahtarda);
  elle sürüm bump'lamak gerekmez.
- OG'de HIT olunca font indirilmez; tamamen önbellekli bir build ağ erişimi olmadan çalışır.
- Başarılı build sonunda o build'de kullanılmayan kayıtlar silinir (silinen/değişen yazıların
  artıkları birikmez). Düşen build hiçbir şey silmez.
- Önbellek build'i **kıramaz**: okuma/yazma hatası MISS sayılır. Hiçbir şey `dist/`e yazılmaz.
- Dizin sabittir (`src/lib/build-cache.ts` → `CACHE_DIR`), ortam değişkeniyle değişmez; blog
  kaynağı gibi site değerleri de yalnızca `wrangler.toml` `[vars]` bölümünden okunur.
- Yeni önbellekli üretici eklerseniz ad alanını `src/integrations/build-cache.ts` →
  `NAMESPACES` listesine de yazın, yoksa artıkları temizlenmez.

## Sınırlar (bilerek)

- **`dist/` kalıcı değilse atlama olmaz** (varsayılan modda). Cloudflare/Vercel'de bu böyle ve
  istenen şey; GitHub Actions'ta `--no-dist-check` bunu bilerek kapatır (yukarıda).
- **Önbellek saklanmıyorsa kazanç yok.** Barındırıcı `node_modules/.astro`yu saklamıyorsa her
  build tam maliyetle koşar (davranış bozulmaz).
- **Uzak blog kaynağı varken atlama olmaz** (yukarıda 3. madde); önbellek yine çalışır.
- Deploy tarafı zaten artımlıdır: `wrangler deploy` yalnızca içeriği değişen dosyaları yükler.
