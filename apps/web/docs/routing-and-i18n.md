# Routing and i18n

> **Bu sayfa `i18n` özelliğini varsayar.** Projeniz tek dilli üretildiyse ya da
> `bun run remove -- i18n` çalıştırdıysanız burada anlatılanların çoğu geçerli değildir:
> `/tr/` ve `/en/` ön ekleri yoktur, kök dil yönlendirme sayfası ve dil değiştirici
> silinmiştir, `routePath()` artık ön ek üretmez. Ayrıntı için
> [docs/README.md](./README.md).

## Structure overview

Tüm diller **ön ekli**. Varsayılan dil dahil:

```
/                 dil algılayan yönlendirme sayfası (noindex)
/tr/              Türkçe ana sayfa
/tr/blog/         /tr/blog/<slug>/
/tr/iletisim/     lokalize slug
/tr/gizlilik/
/tr/rss.xml
/en/              İngilizce ana sayfa
/en/blog/
/en/contact/      aynı sayfanın İngilizce slug'ı
/en/privacy/
/en/rss.xml
/404
/og/home.png      ana sayfa OG görseli
/og/blog-<dosya-adı>.png   her yazının OG görseli (ör. blog-tr-hosgeldiniz, blog-en-welcome)
```

`astro.config.mjs`:

```js
i18n: {
  defaultLocale: 'tr',
  locales: ['tr', 'en'],
  routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
},
```

`prefixDefaultLocale: true` → kök `/` boşta kalır. `redirectToDefaultLocale: false`
**bilerek** kapalı: kökü biz sahipleniyoruz. Astro'nun kendi yönlendirmesi açık olsaydı
her ziyaretçi tarayıcı dilinden bağımsız olarak `/tr/`ye giderdi.

## Trailing slash

`routePath()` daima sonda `/` ile döner: `/tr/`, `/tr/iletisim/`, `/en/contact/`.

Sebep ölçüldü: Astro varsayılanları `build.format: 'directory'` + `trailingSlash: 'ignore'`,
yani prerender `/tr/iletisim/index.html` üretir ve o sayfanın `Astro.url.pathname` değeri
`/tr/iletisim/` olur. Kanonik URL bu biçimden türediği için hreflang'ler, sitemap girdileri
ve iç linkler de aynı biçimi taşımak zorunda — aksi halde kanonik URL kendi hreflang'inden
farklı olurdu.

## Route registry — `src/i18n/routes.ts`

Ham URL'ler hiçbir yerde yazılmaz. Her sayfanın bir **route anahtarı** vardır ve yol,
anahtardan üretilir.

```ts
export const routes = {
  home:    { tr: '',          en: '' },
  blog:    { tr: '/blog',     en: '/blog' },
  contact: { tr: '/iletisim', en: '/contact' },
  privacy: { tr: '/gizlilik', en: '/privacy' },
};
```

(Gerçek dosyada `blog` ve `contact` girdileri kendi özellik marker'larıyla sarılıdır ve her
dil satırı ayrı durur — bkz. aşağıdaki [marker düzeni](#marker-düzeni-neden-böyle).)

Kayıt defterinin sağladığı fonksiyonlar:

| Fonksiyon                           | Ne döner                            | Örnek                                         |
| ----------------------------------- | ----------------------------------- | --------------------------------------------- |
| `routePath(key, locale)`            | Ön ekli, sondaki slash'li yol       | `routePath('contact','en')` → `/en/contact/`  |
| `blogPostPath(slug, locale)`        | Yazı yolu (`blog` özelliği)         | `/tr/blog/hosgeldiniz/`                       |
| `alternatesFor(key)`                | Tüm dillerdeki karşılıklar          | `{ tr: '/tr/iletisim/', en: '/en/contact/' }` |
| `localizedHref(hrefOrHash, locale)` | Hash'i o dilin ana sayfasına bağlar | `'#features'` → `/tr/#features`               |
| `navHref(link, locale)`             | Nav girdisini href'e çevirir        | —                                             |
| `isActiveNav(link, current)`        | Aktif link mi                       | pathname karşılaştırmaz                       |

`localizedHref` neden var: `/tr/iletisim/` sayfasındayken çıplak `#features` hiçbir yere
gitmez, hedef bölüm ana sayfadadır.

`isActiveNav` neden pathname karşılaştırmaz: lokalize slug'larda ve sondaki slash
farklarında string karşılaştırma sessizce yanlış sonuç verir. Bunun yerine her sayfa
`BaseLayout`'a kendi `route` anahtarını bildirir, karşılaştırma anahtar üzerinden yapılır.
Registry'de karşılığı olmayan sayfalar (404) `route` vermez — hiçbir link aktif olmaz.

## Adding a new page

Örnek: `/tr/hakkimizda/` ve `/en/about-us/`.

1. **Registry'ye kaydet** — `src/i18n/routes.ts` içindeki `routes` nesnesine ekleyin.
   Her dil **kendi satırında** durmalı ve `en` satırı `i18n` satır marker'ını taşımalı:

   ```ts
   about: {
     tr: '/hakkimizda',
     en: '/about-us', // @feature:i18n
   },
   ```

2. **Sayfa dosyalarını oluştur** — `src/pages/tr/hakkimizda.astro` ve
   `src/pages/en/about-us.astro`. Dosya adı registry'deki yol parçasıyla **birebir**
   eşleşmeli; eşleşmezse iç linkler var olmayan bir sayfayı gösterir ve **build hata vermez**.

3. **Sayfada alternates ve route bildir**:

   ```astro
   ---
   import BaseLayout from '@/layouts/BaseLayout.astro';
   import { alternatesFor } from '@/i18n/routes';
   const alternates = alternatesFor('about');
   ---
   <BaseLayout title="…" description="…" locale="tr" {alternates} route="about">
     …
   </BaseLayout>
   ```

4. **Navigasyona ekle (isteğe bağlı)** — `src/data/tr/nav.ts` ve `src/data/en/nav.ts`:

   ```ts
   { label: 'Hakkımızda', route: 'about' },
   ```

   `route` bir registry anahtarı, `hash` ise ana sayfa içindeki bir bölümdür; ikisi de
   `navHref()` ile çözülür. Ham `href` yazılmaz.

5. **Doğrula**: `bun run check && bun run test && bun run build`.

### Why the marker layout looks like this

`src/i18n/routes.ts` içinde her dil kendi satırındadır çünkü satır sonundaki `i18n`
marker'ı `en` girdisini **tek başına** sökebilsin diye. `{ tr: '…', en: '…' }` tek satırda
yazılsaydı `i18n` çıkarıldığında ölü `en` verisi geride kalırdı.

Aynı sebeple `routePath()` içindeki dil ön eki ayrı bir satırdır:

```ts
let path: string = routes[key][locale];
path = `/${locale}${path}`; // @feature:i18n
return `${path}/`;
```

`i18n` çıkarıldığında bu satır silinir ve `/tr/iletisim/` → `/iletisim/` olur. Ön ek şablon
metnine gömülü olsaydı çıkarma sonrası **her iç link** var olmayan `/tr/...` yollarını
gösterirdi — yine build hata vermeden.

## How root `/` decides

`src/pages/index.astro` bir durak, hedef değil. `BaseLayout` **kullanmaz**: header, footer,
GSAP, analytics ve ClientRouter burada yüklenmez; Tailwind stylesheet'i bile çekilmez
(satır içi stil kullanılır), çünkü sayfa saniyenin onda birinde terk edilir.

Karar sırası (`is:inline` script, istemcide):

1. `localStorage.getItem('locale')` — ziyaretçinin **açık** tercihi. Bu değeri
   `Header.astro` içindeki dil değiştirici, tıklandığı anda yazar.
2. `navigator.languages` listesi — sırayla taranır, `tr-TR` → `tr` olarak indirgenir.
3. `routePath('home', defaultLocale)` — hiçbiri tutmazsa.

Yönlendirme `location.replace()` ile yapılır; `assign` olsaydı kök geçmişe yazılır ve
"geri" tuşu sonsuz döngüye girerdi.

JS kapalıysa `<noscript>` içindeki `meta refresh`, o da engellenmişse sayfadaki iki dil
bağlantısı devrededir (her etiket kendi dilinde yazılır).

Hedef listesi `locales`'ten türetilir (`Object.fromEntries(locales.map(...))`) — **yeni dil
eklendiğinde bu sayfa kendiliğinden büyür.**

Sayfa `noindex` taşır ve sitemap'ten `astro.config.mjs` içindeki
`filter: (page) => new URL(page).pathname !== '/'` kuralıyla dışlanır. Bu filtre `i18n`
marker'ının **içindedir**: i18n çıkarıldığında `/` gerçek ana sayfa olur ve sitemap'te
yer almalıdır.

## hreflang / canonical chain

```
Sayfa
 └─ alternatesFor('contact')  ya da blog için translationKey eşlemesi
     └─ BaseLayout  (yalnızca taşır)
         └─ MetaTags.astro
             ├─ <link rel="canonical" href={new URL(Astro.url.pathname, site)}>
             ├─ <link rel="alternate" hreflang="tr" …>
             ├─ <link rel="alternate" hreflang="en" …>
             └─ <link rel="alternate" hreflang="x-default" href={alternates[defaultLocale]}>
```

`site` değeri `Astro.site` (yani `astro.config.mjs` → `site`), yoksa `siteConfig.url`.
İkisinin de doğru olması gerekir — ayrıntı [configuration.md](./configuration.md#the-site-field).

**Sitemap ayrı bir kanaldır ve daha zayıftır.** `@astrojs/sitemap`'in i18n desteği yalnızca
ön ek soyulduktan sonra yolları **aynı** olan sayfaları `xhtml:link` ile eşler
(`/tr/` ↔ `/en/`, `/tr/blog/` ↔ `/en/blog/`). Lokalize slug'lar (`/tr/iletisim/` ↔
`/en/contact/`) sitemap'te eşleşmez; onların hreflang'i sayfa `<head>`'inden gelir — ki
arama motorlarının öncelikli kaynağı da odur. Bu bilinçli bir sınırdır, hata değil.

## Language switcher does NOT parse URLs

`Header.astro` içindeki değiştirici hedefi `alternates` prop'undan alır:

```ts
const switchHref = Astro.props.alternates?.[otherLocale] ?? routePath('home', otherLocale);
```

URL'i geriye doğru parse etmek lokalize slug'larda (`/tr/iletisim/` → `/en/…` ne?) ve blog
yazılarında (slug'lar farklı) zaten imkânsızdır. Bu yüzden **her sayfa kendi alternates'ini
hesaplar**, layout yalnızca taşır.

`alternates` verilmemişse (ör. 404) diğer dilin **ana sayfasına** düşülür — asla 404'e değil.

Tıklama anında seçim `localStorage.locale` altına yazılır; kökteki yönlendirme sayfası bir
sonraki ziyarette bunu okur.

## Blog: `translationKey`

Blog yazılarının slug'ları lokalizedir (`tr-hosgeldiniz.md` ↔ `en-welcome.md`), dolayısıyla
diller arası eşleme slug'a göre yapılamaz. `src/content.config.ts` şemasındaki ortak alan bunu çözer:

```md
---
title: 'Template'e hoş geldiniz'
description: '…'
date: 2026-08-01
locale: tr
translationKey: welcome
---
```

`src/pages/tr/blog/[slug].astro` karşılığı bu anahtarla arar; bulamazsa dil değiştirici o
dilin **blog index'ine** düşer, 404'e değil.

Dosya adı ön eki (`tr-`, `en-`) hem koleksiyon filtresinin (`data.locale`) hem de slug
türetmenin (`post.id.replace(/^tr-/, '')`) dayanağıdır. Yeni yazı eklerken üçü tutarlı olmalı:
dosya adı ön eki, `locale` alanı ve `translationKey`.

---

# Adding a new language

En sık yapılacak iş budur. Örnek: Almanca (`de`). Sıra önemlidir; her adımdan sonra
`bun run check` çalıştırmak hataları erken gösterir.

### 1. Dictionary

```bash
cp src/i18n/tr.json src/i18n/de.json
```

İçindeki tüm değerleri çevirin. Anahtar yapısı **birebir aynı** kalmalı.

### 2. Register in the `Locale` type — `src/i18n/utils.ts`

```ts
import tr from './tr.json';
import en from './en.json'; // @feature:i18n
import de from './de.json'; // @feature:i18n

const translations = {
  tr,
  en, // @feature:i18n
  de, // @feature:i18n
};
```

`Locale` tipi bu nesneden **çıkarım** yoluyla türer. Nesneye `Record<string, ...>`
anotasyonu **eklemeyin**: anahtar kümesi `string`e genişler ve geçersiz bir dil kodu
sessizce kabul edilir. (Aynı tuzak `routes` nesnesi için de geçerli.)

### 3. Content bundle

```bash
cp -R src/data/tr src/data/de
```

`src/data/de/*.ts` içindeki tüm metinleri çevirin. `src/data/de/index.ts` olduğu gibi kalır.
Sonra `src/data/index.ts`:

```ts
import * as tr from './tr';
import * as en from './en'; // @feature:i18n
import * as de from './de'; // @feature:i18n

const bundles: Record<string, typeof tr> = {
  tr,
  en, // @feature:i18n
  de, // @feature:i18n
};
```

`typeof tr` referans şekildir: `de` paketi eksik bir alan bırakırsa `astro check` hata verir.

### 4. Route registry — `src/i18n/routes.ts`

`routes` içindeki **her** anahtara bir `de` satırı ekleyin:

```ts
contact: {
  tr: '/iletisim',
  en: '/contact', // @feature:i18n
  de: '/kontakt',  // @feature:i18n
},
```

`alternatesFor()` `locales` üzerinde döndüğü için kendiliğinden `de` anahtarını da üretir.
Buna karşılık **elle yazılmış** `Alternates` nesneleri (blog detay sayfalarındaki
`{ tr: …, en: … }` bloğu) eksik kalır ve `Alternates` tipi `Record<Locale, string>` olduğu
için `astro check` bunları tek tek raporlar — tip denetimi size yapılacaklar listesi verir.

### 5. Sayfalar

```bash
cp -R src/pages/tr src/pages/de
```

Sonra `src/pages/de/` altındaki her dosyada:

- `locale="tr"` → `locale="de"`
- `useTranslations('tr')` → `useTranslations('de')`
- `getData('tr')` → `getData('de')`
- blog sayfalarında `data.locale === 'tr'` → `'de'` ve `/^tr-/` → `/^de-/`
- `formatDate(post.data.date, 'tr')` → `'de'`
- Dosya adlarını registry'deki slug'lara göre yeniden adlandırın
  (`iletisim.astro` → `kontakt.astro`, `gizlilik.astro` → `datenschutz.astro`).

### 6. Astro yapılandırması — `astro.config.mjs`

```js
i18n: {
  defaultLocale: 'tr',
  locales: ['tr', 'en', 'de'],
  routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
},
…
sitemap({
  i18n: { defaultLocale: 'tr', locales: { tr: 'tr-TR', en: 'en-US', de: 'de-DE' } },
  …
})
```

### 7. Blog kullanılıyorsa — `src/content.config.ts`

```ts
locale: z.enum(['tr', 'en', 'de']).default('tr'),
```

Almanca yazılar `content/blog/de/<slug>/index.md` olarak eklenir; `locale: de` ve karşılığı olan
yazıyla aynı `translationKey`.

### 8. İKİ DİL VARSAYAN YERLER — bunlar elle genelleştirilmeli

Şablon iki dille geldiği için birkaç yerde ikili (`tr` mi, değilse `en`) mantık var.
Üçüncü dilde bunlar **sessizce yanlış** sonuç verir; hiçbiri build'i kırmaz:

| Dosya                                               | Satır tipi                                                   | Ne yapmalı                                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `src/components/sections/Header.astro`              | `const otherLocale: Locale = locale === 'tr' ? 'en' : 'tr';` | Tek "diğer dil" düğmesi yerine `locales` üzerinde dönen bir liste/menü yazın. `switchHref` de o listeden üretilmeli. |
| `src/components/seo/MetaTags.astro`                 | `og:locale` → `locale === 'tr' ? 'tr_TR' : 'en_US'`          | Dil kodu → OG etiketi eşlemesi yapan bir nesne kullanın.                                                             |
| `src/lib/utils.ts`                                  | `formatDate` → `locale === 'tr' ? 'tr-TR' : 'en-US'`         | Aynı şekilde eşleme nesnesi.                                                                                         |
| `src/pages/tr/blog/[slug].astro` (ve dil kopyaları) | Karşılık araması yalnızca `en` koleksiyonuna bakar           | `locales` üzerinde dönüp her dil için `translationKey` eşleşmesi arayın.                                             |

### 9. Çıkarma manifest'i — `features.manifest.ts`

`i18n` özelliği "tek dile in" anlamına gelir. Yeni dilin dosyaları listeye eklenmezse
`bun run remove -- i18n` sonrası ortada kalırlar:

```ts
i18n: {
  files: [
    'src/pages/en',
    'src/pages/de',
    'src/pages/index.astro',
    'src/data/en',
    'src/data/de',
    'src/i18n/en.json',
    'src/i18n/de.json',
    'content/blog/en',
    'content/blog/de',
  ],
  moves: [{ from: 'src/pages/tr', to: 'src/pages' }],
},
```

### 10. Testler ve doğrulama

`tests/i18n.test.ts` ve `tests/routes.test.ts` dil listesine bağlı iddialar içerir; yeni
dil için gerekiyorsa genişletin. Sonra sırayla:

```bash
bun run check
bun run test
bun run build
bun run test:removal -- --only=i18n
```

Son komut kritik ama sınırlıdır: `i18n` çıkarılmış geçici bir kopyada `astro check` +
`astro build` + `vitest` koşar. Yani yeni dilden geriye kalan bir şey **derlemeyi, tip
denetimini ya da testleri kırıyorsa** yakalanır. Hiçbirini kırmayan bir artık (örneğin
manifest'in `files` listesine yazmayı unuttuğunuz öksüz bir `src/i18n/de.json`) sessizce
geride kalır — matris "dosya kalmadı" diye bir tarama yapmaz. Bunu yakalamak istiyorsanız
dil listesine bağlı bir iddiayı `tests/i18n.test.ts` içine yazın.

### 11. Sihirbaz hakkında not

`scripts/create-cli/index.mjs` `--lang` bayrağında yalnızca `tr`, `en` ve `both` değerlerini tanır.
Üçüncü bir dil eklemek sihirbazın dil sorusunu kendiliğinden büyütmez; sihirbazı da
kullanacaksanız orayı ayrıca genişletmeniz gerekir. Şablonun kendisi ve `bun run remove`
motoru yeni dilden etkilenmez.
