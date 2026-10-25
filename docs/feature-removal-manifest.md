# Feature removal — manifest

[Ana belgeye dönür](./feature-removal.md).

`features.manifest.ts` her özelliği tek bir nesneyle tanımlar:

```ts
export interface FeatureDef {
  description: string;
  files?: string[];
  dependencies?: string[];
  patterns?: { glob: string; find: string; replace: string }[];
  moves?: MoveRule[];
}
```

---

## `description`

Sihirbazın (`scripts/create-cli`) çoktan seçmeli listesinde ipucu olarak ve
`bun run remove` kullanım çıktısında görünür.

---

## `files`

Silinecek dosya/dizin yolları (proje köküne göre).

- İçinde `*` varsa glob olarak çözülür (`onlyFiles: false` — dizinler de eşleşir).
- Var olmayan yol **sessizce atlanır**. Bu bilerek: bazı yollar yalnızca belirli bir
  çıkarma sırasında var olur.
- Dizinler özyinelemeli silinir.

**Sıra bağımlılığı:** `i18n` çıkarıldığında sayfalar köke taşınır. Bu yüzden diğer
özellikler **her iki yerleşimi de** listelemek zorundadır:

```ts
files: [
  'src/pages/tr/blog',   // i18n henüz çıkarılmadıysa
  'src/pages/en/blog',
  'src/pages/blog',      // i18n önce çıkarıldıysa
]
```

---

## `dependencies`

`package.json` içindeki `dependencies` ve `devDependencies` bloklarından silinir.
`bun.lock` **doğrudan düzenlenmez**; motor doğrulama adımında `bun install`
çalıştırdığı için lock kendiliğinden uzlaşır. `--no-install` kullanırsanız bu uzlaşma
olmaz (bkz. [bilinen sınırlar](./feature-removal-matrix.md#bilinen-sınırlar)).

---

## `patterns`

Marker'la **ifade edilemeyen** dönüşümler. Ham regex olduğu için motorun en riskli yolu;
şablonda tek kullanıcısı var: Tailwind `dark:` sınıfları satır **içinde**, kendi satırları
olmadan yaşar.

```ts
patterns: [{ glob: 'src/**/*.{astro,css}', find: DARK_CLASS_PATTERN, replace: '' }]
```

`DARK_CLASS_PATTERN` manifest'in başında parçalardan kurulur (arbitrary value'lar
`[#0b1220]` tek parça sayılır, `bg-darker` gibi sınıflar korunur, sol sınır zorunludur).
Davranışı `tests/markers.test.ts` içinde **manifest'ten okunarak** kilitlenmiştir — kopya
bir desenle değil — böylece deseni değiştiren her düzenleme testle karşılaşır.

Yeni bir `patterns` kuralı yazacaksanız aynısını yapın: şablonu testi manifest'ten okusun.

---

## `moves`

Silmeyle ifade edilemeyen tek dönüşüm: dosya taşıma. Şablonda tek kullanıcısı `i18n`:

```ts
moves: [{ from: 'src/pages/tr', to: 'src/pages' }]
```

Kurallar (`scripts/lib/moves.ts`):

- Kaynak yoksa kural sessizce atlanır.
- Kaynak **dizin** ve hedef **varsa**: kaynağın girdileri hedefe taşınır (birleştirme),
  boşalan kaynak silinir.
- Aksi halde kaynak doğrudan hedefe yeniden adlandırılır.
- Hedefte aynı adlı girdi varsa **hata fırlatır ve hiçbir şey taşımaz**. Sessiz üzerine
  yazma yoktur: kök `index.astro` taşımadan önce silinmeseydi `tr/index.astro` onun üstüne
  yazardı — sıra hatası gürültülü olmalı.

---

## Motorun çalışma sırası

Her özellik için, verilen sırayla:

```
1. files       →  sil
2. moves       →  taşı        (silmeden SONRA: çakışacak dosyalar ortadan kalkmış olur)
3. marker      →  süpür       (taşımadan SONRA: dosyalar YENİ yerlerinde bulunmalı)
4. patterns    →  uygula
5. dependencies→  package.json'dan düş
```

Tüm özellikler bittikten sonra, bir kez:

```
6. bun install     (--no-install verilmedikçe ve --no-verify verilmedikçe)
7. bun run build   (--no-verify verilmedikçe)
```

---

## Kendi özelliğinizi çıkarılabilir yapmak

Örnek: `gallery` adında yeni bir bölüm.

### 1. Ad seçin

Sihirbazın manifest ayrıştırıcısı `[A-Za-z0-9-]` karakter kümesini tanır — yani büyük harf de
teknik olarak geçerlidir. Yine de şablonun tamamı **küçük harf, rakam ve tire** kullanıyor;
aynısını yapın.

**Tireli ad seçerseniz manifest anahtarını tırnaklayın.** TypeScript tireli bir nesne
anahtarını tırnaksız kabul etmez: `case-studies: {` sözdizimi hatasıdır, `'case-studies': {`
doğrudur. Ayrıştırıcı iki biçimi de tanır (tırnak isteğe bağlıdır), ama tireli adlarda
tırnağı **TypeScript** zorunlu kılar. Gerçek manifestte `'dark-mode'` ve `'case-studies'`
bu yüzden tırnaklıdır; aşağıdaki `gallery` örneği tiresiz olduğu için tırnaksız yazılabiliyor.

### 2. Kodu marker'layın

Bölüm bileşenini ve onu kullanan her yeri işaretleyin. Tipik olarak dokunulacak yerler:

```astro
<!-- src/pages/tr/index.astro (ve her dilin kopyası) -->
import Gallery from '@/components/sections/Gallery.astro'; /* @feature:gallery */
…
<!-- @feature:gallery -->
<Gallery locale="tr" />
<!-- @/feature:gallery -->
```

```ts
// src/data/tr/index.ts ve src/data/en/index.ts
export * from './gallery'; // @feature:gallery
```

```ts
// src/data/tr/nav.ts ve en/nav.ts — navigasyonda bir girdisi varsa
{ label: 'Galeri', hash: '#gallery' }, // @feature:gallery
```

`src/i18n/*.json` içindeki anahtarlar marker'lanamaz (JSON yorum desteklemez); kullanılmayan
anahtarlar yerinde bırakılır, build'i etkilemezler.

### 3. Manifest'e kaydedin

`features.manifest.ts` → `features` nesnesine ekleyin:

```ts
  gallery: {
    description: 'Görsel galerisi bölümü',
    files: [
      'src/components/sections/Gallery.astro',
      'src/data/tr/gallery.ts',
      'src/data/en/gallery.ts',
    ],
  },
```

**Biçim serbest değil.** `scripts/create-cli/index.mjs` manifest'i TypeScript olarak olarak import edemez
(düz Node ESM'dir ve o noktada şablonun `node_modules`'ı henüz kurulu değildir), bu yüzden
dosyayı **metin olarak** ayrıştırır. İki satır tam olarak şu kalıplara uymalı:

- Özellik anahtarı: **2 boşluk** girinti, ardından ad (isteğe bağlı tek tırnak içinde),
  `: {` ve satır sonu. Yani `  gallery: {` de `  'photo-gallery': {` de tanınır; tireli
  adlarda tırnak TypeScript yüzünden zaten zorunludur.
- Açıklama: **4 boşluk** girinti, `description: '…',` — tek tırnak, sondaki virgülle.

Uymayan bir biçim sihirbazın özelliği hiç görmemesine (yani üretilen her projede istenmeyen
kodun kalmasına) yol açar. Ayrıştırma tamamen bozulursa sihirbaz gürültülü şekilde ölür.

### 4. TR/EN aynasını koruyun

Veri dosyaları her dilde **aynı şekle** sahip olmalı ve `files` listesinde **hepsi**
bulunmalı. Bir dilin dosyası unutulursa:

- `tests/data.test.ts` "en bundle tr ile aynı yapıdadır" iddiasıyla kırılabilir,
- ya da `src/data/index.ts` içindeki `typeof tr` referans şekli yüzünden `astro check`
  hata verir.

### 5. i18n taşımasını hesaba katın

Özelliğinizin `src/pages/tr/**` altında bir dosyası varsa, `i18n` önce çıkarıldığında o
dosya köke taşınmış olur. Her iki yolu da `files` listesine yazın (bkz.
[`files`](#files)).

### 6. Testleri sahiplendirin

Özelliğinizin **kaynak dosyasını okuyan** bir test varsa (regresyon kilitleri böyle
çalışır), o test kendi dosyasında durmalı ve manifest'in `files` listesinde yer almalı.
Aksi halde özellik çıkarıldığında test `ENOENT` ile tüm suite'i çökertir.

Testi marker'la sökmek de yeterli değildir; bir bir dosyada hiç test kalmazsa vitest
_"no test suite found"_ der. Bu yüzden `tests/spa-analytics.test.ts` ve
`tests/spa-forms.test.ts` ayrı dosyalardır ve her biri kendi özelliğine kayıtlıdır.

Özelliğe bağlı **iddiaları** (aynı dosyada başka testler de varsa) marker'la sökmek doğru
yaklaşımdır — `tests/data.test.ts` ve `tests/routes.test.ts` bunu yapar.

### 7. Doğrulayın

```bash
bun run check                           # tip denetimi (motor bunu koşmaz)
bun run test                                # marker hijyeni + birim testler
bun run test:removal -- --only=gallery  # tek kombinasyon (~25 sn)
bun run test:removal                    # tüm matris (4-7 dk)
```

Matris her kombinasyon için geçici bir kopyada `remove` + `astro check` + `astro build` +
`vitest` koşturur ve budanmış bağımlılıklara sarkan referans kalmadığını da statik olarak
denetler. Kaynak dosyalarınıza **dokunmaz**: kopyalar proje kökü altındaki `.removal-tmp/`
klasöründe açılır (`.gitignore`'da) ve koşu sonunda silinir — `--keep` verilirse yalnızca
başarısız kombinasyonların klasörü kalır.

Özelliğiniz başka bir özellikle etkileşiyorsa `scripts/test-removal.ts` içindeki `combos`
listesine bir kombinasyon ekleyin. Matris varsayılan olarak her özelliği tek tek, elle
seçilmiş 3 etkileşimi ve hepsini birden koşar — 10 özelliğin 1023 alt kümesinden 14'ü.
"Matris yeşil" = "sınanan kombinasyonlar sağlam", "her kombinasyon sağlam" **değil**.
