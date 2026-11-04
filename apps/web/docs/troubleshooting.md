# Troubleshooting

Bu sayfadaki her madde bu şablonda **gerçekten yaşandı**. Ortak özellikleri şu: çoğu
build'i kırmaz, tarayıcıda ya da yayında sessizce yanlış davranır.

---

## Installation

### `bun install` complains about Node version

Astro 7 `node >= 22.12` ister ve `package.json` → `engines` bunu bildirir.

```bash
node -v      # v22.12.0 veya üstü olmalı
```

CI'da `.github/workflows/ci.yml` `node-version: "22"` kullanır. Yükseltirken `engines`
alanını da güncelleyin.

### `ERR_MODULE_NOT_FOUND: @clack/prompts`

Sihirbazı çalıştırırken alınır. Sihirbazın bağımlılığı **şablonun** `node_modules`'ında
değil, `scripts/create-cli/node_modules` altındadır:

```bash
cd scripts/create-cli && bun install && cd ../..
node scripts/create-cli/index.mjs my-landing
```

Bu hatayı hiç görmemeniz de mümkün — Node yukarı doğru çözümleme yaptığı için şablonun
ağacında tesadüfen bir `@clack/prompts` kopyası varsa sihirbaz **kazara** çalışır. Temiz bir
klonda çalışmaz. Kurulum adımını atlamayın.

### Wizard says "Target folder cannot be inside the template"

`cpSync` hedefi kaynağın altında görürse filtreye hiç bakmadan `ERR_FS_CP_EINVAL` fırlatır.
Projeyi şablonun **dışında** bir yola üretin.

---

## Dev server

### `bun run dev` looks alive but I can't reach the port

Astro 7'nin dev sunucusu **arka planda** koşabilir ve bir kilit dosyası kullanır. Kendi
alt komutları var:

```bash
bunx astro dev status          # bir sunucu koşuyor mu
bunx astro dev stop            # arka plandaki sunucuyu durdur
bunx astro dev logs --follow   # arka plan sunucusunun log'ları
```

Arka plan sunucusunun çıktısı `.astro/dev.log` dosyasına yazılır. Kilit yüzünden yeni bir
sunucu başlamıyorsa `bunx astro dev --ignore-lock` ile zorlayabilirsiniz — ama önce
`stop` denemek daha temizdir.

Bu davranış özellikle **araç/otomasyon sarmalayıcılarını** yanıltır: süreç "çalışıyor"
görünür ama portu tutan başka bir örnektir.

---

## Build

### `OG font download failed (…)`

Build, OG görselleri için Inter fontunu bir CDN'den indirir. Ağ erişimi olmayan bir ortamda
build başarısız olur. Ayrıntı ve çözüm:
[deployment.md → Build ağ erişimi ister](./deployment.md#build-requires-network-access).

### Build is green but the page is broken

`astro build` **tip denetimi yapmaz** ve kırık iç linkleri görmez. Bir özellik çıkarmasının
tüm iç linkleri sessizce 404 yaptığı bir vaka yaşandı ve build yeşildi. Bu yüzden
doğrulama her zaman üç adımdır:

```bash
bun run check && bun run test && bun run build
```

---

## When copying from older examples

Dolaşımdaki çoğu Astro örneği bu şablonun kullandığı biçimden farklı yazılmıştır.
Kopyaladığınız kod soldaki biçimlerden birini kullanıyorsa sağdakine çevirin:

| Örneklerde sık görülen              | Bu şablonda                     | Nerede                     |
| ----------------------------------- | ------------------------------- | -------------------------- |
| `import { z } from 'astro:content'` | `import { z } from 'astro/zod'` | `src/content.config.ts`    |
| Node 18/20 varsayımı                | Node >= 22.12                   | `package.json` → `engines` |

## Turkish characters missing in OG images

Belirti: `/og/*.png` içinde ş/ğ/ı/İ harfleri boş kutu ya da hiç yok. Build **hata vermez**,
`bun run build`'un başarılı olması bu konuda hiçbir şey kanıtlamaz.

İki ayrı sebep var; ikisi de `src/pages/og/[slug].png.ts` içinde:

1. **`latin-ext` alt kümesi yüklenmemiş.** Türkçeye özgü harfler `latin` alt kümesinde
   yoktur.
2. **İki font aynı `name` altında kayıtlı.** Satori 0.29 aynı `name`+`weight`+`style`
   anahtarına sahip girdilerde yalnızca **ilkini** tutar ve glif başına geri düşüş
   **yapmaz**. Yani `latin` ve `latin-ext` fontlarını ikisi de `name: 'Inter'` ile
   kaydetmek `latin-ext`i pratikte hiç kullanmaz.

Şablondaki doğru kurulum: fontlar **farklı isimlerle** kaydedilir ve kapsayıcıya CSS tarzı
virgüllü bir düşüş listesi verilir —

```ts
fontFamily: 'Inter, Inter Ext',
…
fonts: [
  { name: 'Inter',     data: interLatin, weight: 700, style: 'normal' },
  { name: 'Inter Ext', data: interExt,   weight: 700, style: 'normal' },
]
```

`fontFamily` listesindeki adlar `fonts` dizisindeki `name` değerleriyle **birebir**
eşleşmelidir. Doğrulamanın tek yolu üretilen PNG'ye bakmaktır.

---

## Script doesn't run after view transition

Bu şablonda en çok tekrar eden hata sınıfı budur. Kök sebep tek: **Astro istemci-taraflı
gezinmede sayfayı değiştirir ama bir script'i ikinci kez çalıştırmaz** (çalışmış script'ler
`data-astro-exec` ile işaretlenir). Belirti hep aynı: tam sayfa yüklemede çalışır,
bir iç linke tıklayarak geldiğinizde çalışmaz.

**Kontrol listesi:**

- Dinleyici `document`'a mı bağlı? Elemana doğrudan bağlanan dinleyici ilk geçişten sonra
  ölür. Şablondaki tüm script'ler
  `document.addEventListener(type, e => e.target.closest('[data-x]'))` desenini kullanır.
- Her gezinmede tekrar koşması gereken iş `astro:page-load` olayına bağlı mı? GSAP init'i
  (`BaseLayout.astro`), onay bandı (`ConsentBanner.astro`) ve Turnstile kutusu
  (`ContactForm.astro`) böyle çalışır.
- Eski bir DOM düğümüne referans mı tutuluyor? Swap sonrası o düğüm belgede değildir; ona
  yazmak sessizce hiçbir şey yapmaz. Her seferinde yeniden sorgulayın (`NavProgress.astro`
  bunu örnekler).
- Oturum boyunca yaşaması gereken bir bayrak varsa `window` üzerinde tutun — `<head>` swap'ta
  değişir, DOM'a yazılan bayrak kaybolur.

### Turnstile widget is empty, form returns 403 `turnstile`

`challenges.cloudflare.com/turnstile/v0/api.js` kutuları **yalnızca kendi yüklendiği anda**
otomatik çizer ve içinde `MutationObserver` yoktur. Astro swap'tan sonra script'i yeniden
çalıştırmadığı için kutu hiç oluşmaz, `cf-turnstile-response` alanı gelmez ve sunucu
doğrulaması reddeder.

Şablondaki çözüm: api.js `?render=explicit` ile yüklenir, kutu her `astro:page-load`'da
**elle** `render()` edilir ve sayfadan ayrılırken `remove()` edilir (kaldırılmazsa Turnstile
swap sonrası konsola "Cannot find Widget" basar). `tests/spa-forms.test.ts` bu satırların
geri gitmesini statik olarak engeller.

### Analytics pageviews inflated

**Yapmayın:** her geçişte analytics script'ini yeniden enjekte etmek.

Enjekte edilmiş script **elemanı** `<head>` swap'ında silinir — ama elemanı silmek
**çalışmış script'i geri almaz**. Plausible `pushState`'i zaten kancalamıştır ve
istemci-taraflı gezinmeleri kendisi sayar. Yeniden enjeksiyon her geçişte yaşayan bir örnek
daha bırakır: tam yükleme 1, birinci geçiş +2, ikinci geçiş +3 — sayım sınırsız şişer.
(Ölçüldü.)

Şablondaki doğru davranış: enjeksiyon **oturum başına bir kez**, bayrak `window` üzerinde.
`astro:page-load` kancası yalnızca "onay bu arada verilmişse yakala" görevini görür.

**Sonuç olarak onayın geri alınması oturum içinde mümkün değildir.** Çalışan örneği
durdurmanın yolu yok. Bir "onayı geri al" düğmesi eklerseniz tam sayfa yeniden yükleme
yapmak zorundasınız.

**GA4 notu:** GA4 istemci-taraflı page_view'ı **Gelişmiş Ölçüm → tarayıcı geçmişi olayları**
ayarıyla sunucu tarafında sağlar. Ayar varsayılan olarak açıktır, yani şablon kutudan
çıktığı hâliyle doğrudur. Ayarı kapatırsanız oturum başına yalnızca bir page_view kaydedilir.

### Form submitted twice

`<ClientRouter />` submit olaylarını da yakalayıp istemci-taraflı gezinme başlatır; kendi
`fetch`'inizle birlikte gönderim çift tetiklenir (network log'da iki POST). Çözüm form
elemanına `data-astro-reload` eklemek — `ContactForm.astro` ve `Newsletter.astro` bunu
taşır.

### Consent banner disappears and never returns

Modül script'i oturumda bir kez çalıştığı için görünürlük kontrolü yalnızca ilk yüklemede
yapılıyorsa, henüz karar vermemiş bir ziyaretçi herhangi bir linke tıkladığında band
kaybolur ve oturum boyunca dönmez. Kontrol `astro:page-load`'a bağlanmalı ve banner her
seferinde yeniden sorgulanmalıdır.

---

## Routing and i18n

### An internal link 404s but build is green

Astro iç linkleri doğrulamaz. En sık iki sebep:

1. **Sayfa dosyası ile registry kaydı ayrışmış.** `src/i18n/routes.ts` içinde
   `contact: { en: '/contact' }` yazıyorsa dosya `src/pages/en/contact.astro` olmalı.
2. **Sondaki slash farkı.** Tüm iç linkler `routePath()` üzerinden üretilmeli; elle yazılmış
   `/tr/iletisim` (slash'siz) kanonik URL'den farklı olur.

### After removing a feature, all links still point to `/tr/...`

`routePath()` içindeki dil ön eki satırı marker'ını kaybetmiş demektir:

```ts
path = `/${locale}${path}`; // @feature:i18n
```

Bu satır silinmezse `i18n` çıkarıldıktan sonra sayfalar köke taşınır ama linkler hâlâ ön ekli
yolları gösterir. Build yine yeşil geçer.

### Blog list is empty

`content/blog/<dil>/<slug>/index.md` dosyalarında frontmatter `locale` alanı ile dizin adı
tutarsız olabilir. Blog sayfaları koleksiyonu `data.locale` ile süzer, slug'ı ise dosya adı
ön ekinden türetir (`tr-hosgeldiniz.md` → `hosgeldiniz`). İkisi ayrışırsa yazı hiç
eşleşmez, `[slug]` hiç route üretmez ve **build yeşil geçer**.

### Language switcher takes me to the wrong page

Değiştirici URL parse etmez, sayfanın verdiği `alternates` prop'unu kullanır. Yeni bir sayfa
eklediyseniz `alternatesFor('<route>')` çağrısını ve `route` prop'unu bildirmeyi unutmuş
olabilirsiniz; o durumda değiştirici diğer dilin **ana sayfasına** düşer.

---

## Removal engine

### "Working tree is not clean"

Motor `--force` olmadan kirli ağaçta çalışmaz — geri almanın tek dayanağı git'tir. Önce
commit edin ya da `git stash` ile kenara alın. `--force` ile devam edebilirsiniz, ama o
durumda hata halinde **otomatik geri alma yapılmaz** (yapılsaydı sizin işinizi de silerdi).

### "Unbalanced marker: @feature:x block not closed"

Bir açılış marker'ının kapanışı yok (ya da tersi). Motor durur ve **her şeyi geri alır** —
yarım işlenmiş dosya bırakmaz. Sık sebepler:

- Kapanışta `@/feature:` yerine `@feature:` yazılmış.
- Boşluk eksik: `/*@feature:blog*/` eşleşmez, `/* @feature:blog */` eşleşir.
- Blok marker'ı bir kod satırının yanına yazılmış — blok marker'ları satırın **tek içeriği**
  olmalıdır.
- Satır marker'ı (`// @feature:x`) kendi başına bir satıra yazılmış. Satırın tek içeriği olan
  her marker **blok açılışı** sayılır; kapanışı olmadığı için blok kapanmamış görünür. Satır
  marker'ı gerçekten bir kod satırının **sonunda** durmalıdır.

### "Move conflict: … already exists"

`moves` kuralının hedefinde aynı adlı bir girdi bulundu ve motor **hiçbir şey taşımadan**
durdu. Sessiz üzerine yazma yoktur. Genellikle sıra hatasıdır: taşımadan önce silinmesi
gereken bir dosya `files` listesinde eksiktir.

### After removal `ts(6133) declared but never read`

Bir değişken yalnızca marker bloğunun içinde kullanılıyorsa **tanımı da** o bloğun içinde
olmalıdır. Tanım dışarıda kalırsa özellik çıkarıldığında okuyanı kalmaz ve `astro check`
kırılır. `MetaTags.astro` ve `Header.astro` bu yüzden `alternates` prop'unu marker bloğunun
**içinde** okur.

### After removal `bun install --frozen-lockfile` is rejected

Bağımlılık budama yalnızca `package.json`'ı düzenler; `bun.lock` dokunulmadan
kalır. Varsayılan yolda motor `bun install` çalıştırdığı için lock uzlaşır — ama
`--no-install` kullandıysanız uyumsuzluk kalır. Çözüm:

```bash
bun install
```

### A comment line was removed on its own

Marker biçimini bir açıklama cümlesi içinde yazdınız. Motor satır marker'ını satırın
herhangi bir yerinde arar; o yorum gerçek marker sanılıp silinir ve açıklama ortadan ikiye
bölünür. `bun run test` içindeki marker hijyen testi bunu yakalar. Metni parçalardan kurun:

```ts
const I18N_MARKER = '// @' + 'feature:i18n';
```

### Matrix with `--only=` does nothing / runs everything

```bash
bun run test:removal -- --only=blog     # doğru
bun run test:removal -- --only=         # reddedilir (boş değer)
bun run test:removal -- --instal        # reddedilir (bilinmeyen bayrak)
```

Bayrak adları sessizce yutulmaz; yazım hatası hata verir.

### Matrix says "no hardlink — EXDEV; falling back to full copy, slow"

Matris `node_modules`'i hardlink ile çoğaltır; hardlink dosya sistemi sınırını geçemez.
Bazı konteyner katmanlarında ve ağ birimlerinde desteklenmez ve motor gerçek kopyaya düşer.
Sonuç doğrudur, sadece yavaştır.

`.removal-tmp/` klasörünün proje kökünün **altında** olması bu yüzdendir; `/tmp` çoğu
makinede ayrı bir birimdir.

---

## Tests

### Removing a feature crashes the test suite with `ENOENT`

Bir test o özelliğin **kaynak dosyasını** okuyor ama manifest'in `files` listesinde yer
almıyor. Testi kendi dosyasına alın ve özelliğin `files` listesine ekleyin.

### `No test suite found in file …`

Bir dosyadaki **tüm** testler marker'la söküldü ve dosya boş kaldı; vitest bunu hata sayar.
Ya dosyanın kendisini manifest'in `files` listesine ekleyin, ya da dosyada özellikten
bağımsız en az bir test bırakın.

### `tests/markers.test.ts` caught by the sweep

Takılmamalı: o dosya marker **sözdiziminin fixture**'ıdır ve `SWEEP_IGNORE` içinde
dışlanmıştır. Süpürülürse motor kendi testini bozar. Süpürme kapsamını değiştirirken bu
dışlamayı koruyun.
