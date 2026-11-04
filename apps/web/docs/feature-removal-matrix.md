# Feature removal — matrix and operations

[Back to main doc](./feature-removal.md).

Bu dosya marker sözleşmesinin tam kuralını, motorun çalışma sırasını, doğrulama
bayraklarını, tuzakları ve sihirbazın kullanımını içerir.

---

## Marker sözleşmesi

Motor kodu iki biçimde işaretlenmiş halde bulur. **Biçim birebir uyulmak zorundadır** —
boşluk sayısı dahil.

### Blok marker

Açılış ve kapanış satırın **tek içeriği** olmalıdır (baştaki/sondaki boşluk serbest).
Aradaki her şey silinir.

```ts
/* @feature:blog */
import { getCollection } from 'astro:content';
const posts = await getCollection('blog');
/* @/feature:blog */
```

```astro
<!-- @feature:pricing -->
<Pricing locale="tr" />
<!-- @/feature:pricing -->
```

```css
/* @feature:dark-mode */
@custom-variant dark (&:where(.dark, .dark *));
/* @/feature:dark-mode */
```

`.astro` dosyalarında **frontmatter'da** `/* … */`, **şablon gövdesinde** `<!-- … -->`
kullanılır.

### Satır marker

Bir kod satırının **sonuna** eklenir; yalnızca o satırı siler.

```ts
import en from './en.json'; // @feature:i18n
export * from './team';     // @feature:team
```

```astro
import ThemeToggle from '../ui/ThemeToggle.astro'; /* @feature:dark-mode */
```

Satır marker'ı **yalnızca açılış biçimini** kullanır. `// @/feature:x` satır sonunda hiçbir
şey yapmaz — kapanış biçimi sadece kendi satırında dururken anlamlıdır.

**Tersi de tuzaktır:** satır marker'ı gerçekten bir kod satırının sonunda durmalı. Kendi
başına bir satırda duran `// @feature:x`, motor için satır marker'ı değil **blok açılışı**dır
(blok tanıma "marker satırın tek içeriğidir" kuralına bakar ve `//` biçimini de kabul eder).
Kapanışı olmadığı için çıkarma _"Dengesiz marker: … bloğu kapanmamış"_ hatasıyla durur ve
her şeyi geri alır.

### Tanınan biçimler (birebir)

| Biçim                                     | Açılış                 | Kapanış                 |
| ----------------------------------------- | ---------------------- | ----------------------- |
| Blok yorumu (TS/JS/CSS/astro frontmatter) | `/* @feature:ad */`    | `/* @/feature:ad */`    |
| HTML yorumu (astro şablonu)               | `<!-- @feature:ad -->` | `<!-- @/feature:ad -->` |
| Satır yorumu (TS/JS)                      | `// @feature:ad`       | `// @/feature:ad`       |

Boşluklar **zorunlu**: `/*@feature:blog*/` eşleşmez, marker sessizce çalışmaz.

### Kurallar ve garantiler

- **İç içe aynı marker** desteklenir; derinlik sayılır.
- **Dengesiz marker** (`Error`): kapanışsız açılış ya da açılışsız kapanış motoru durdurur
  ve tüm değişiklikler geri alınır. Sessizce bozuk çıktı üretilmez.
- **Ad sınırı korunur:** `team` sökülürken `// @feature:teams` satırı etkilenmez.
- **Süpürme kapsamı sabittir** (`scripts/lib/markers.ts` → `SWEEP_GLOBS`):

  ```
  src/**/*.{astro,ts,mjs,css}
  tests/**/*.ts
  astro.config.mjs
  ```

  Dışlananlar: `node_modules/**` ve `tests/markers.test.ts` (o dosya marker sözdiziminin
  **fixture**'ıdır — süpürülürse motor kendi testini bozar).

  Listede olmayan **her şey** kapsam dışıdır; kapsam dışındaki bir dosyaya marker yazmak
  hiçbir şey yapmaz. Sık karşılaşılan örnekler: `src/i18n/*.json` (JSON zaten yorum
  desteklemez), `content/**/*.md`, `features.manifest.ts`, `scripts/**`, `public/**`,
  `scripts/create-cli/**`, `docs/**`. `tests/**` içindeki `.ts` dosyaları ise kapsam **içindedir**
  (tek istisna yukarıdaki `tests/markers.test.ts`).

### En sinsi tuzak: yorum metninde marker

Motor, satır marker'ını satırın **herhangi bir yerinde** arar. Yani marker biçimini bir
açıklama cümlesi içinde yazmak, o satırın gerçek marker sanılıp **silinmesine** yol açar:

```ts
// Bu satır tehlikelidir: içindeki // @feature:i18n metni gerçek marker sanılır ve
// i18n çıkarıldığında bu yorum satırı yok olur — yorum ortadan ikiye bölünür.
```

Bu gerçekten yaşandı. Koruma olarak `tests/marker-hygiene.test.ts` süpürülen her dosyayı
tarar ve marker metninin yalnızca **gerçek marker konumlarında** (tek başına duran blok
satırı ya da bir kod satırının sonu) geçtiğini doğrular. Marker biçimini bir yorumda
anlatmanız gerekiyorsa metni parçalardan kurun:

```ts
const I18N_MARKER = '// @' + 'feature:i18n';
```

---

## Doğrulama ve bayraklar

Motorun "doğrulama" dediği şey **`bun install` + `bun run build`**'den ibarettir
(`scripts/remove-feature.ts`). `astro check` ve `vitest` bu zincirin parçası **değildir**;
onları çıkarmadan sonra kendiniz koşarsınız.

| Bayrak         | Etkisi                                               |
| -------------- | ---------------------------------------------------- |
| `--force`      | Git kontrolünü ve temiz-ağaç kontrolünü atlar.       |
| `--no-install` | Doğrulama öncesi `bun install` adımını atlar.        |
| `--no-verify`  | Hem `bun install` hem `bun run build` adımını atlar. |

`--no-verify` verildiğinde `--no-install` zaten etkisizdir; install yalnızca doğrulama
zincirinin parçası olarak çalışır.

### Ön koşullar

Motor `--force` olmadan iki şeyi şart koşar:

1. **Git deposu bulunmalı.** Yoksa: _"Git deposu yok. Geri alma için git gerekli; yine de
   devam etmek için --force kullanın."_
2. **Çalışma ağacı temiz olmalı** — izlenmeyen dosyalar dahil. Değilse çıkarma başlamaz:
   _"Çalışma ağacı temiz değil. Önce commit edin veya `git stash` ile kenara alın."_

İkinci kural katı görünür ama geri almanın tek dayanağı git'tir; kirli ağaçta otomatik geri
alma kullanıcının işini silmek anlamına gelirdi.

### Geri alma davranışı

Herhangi bir adım patlarsa motor hatayı tek satırda yazar ve geri alır:

```
1. revertMoves()      taşınan dosyalar eski yerlerine GERİ TAŞINIR
2. git reset --hard   izlenen dosyalar eski hâline döner
3. bun install        (install çalıştıysa) node_modules eski package.json ile eşitlenir
```

Sıra önemli: reset önce çalışsaydı, taşınmış **izlenmeyen** kopyaları göremezdi.

**`git clean -fd` bilerek KULLANILMIYOR.** Motor izlenmeyen dosya üretir (taşımaların
hedefleri), yani `git reset --hard` tek başına yetmez — ama `git clean` de doğru araç
değildir: kullanıcının kendi izlenmeyen dosyalarını (notlar, taslak sayfalar, yerel araç
ayarları) da silerdi. Bunun yerine yalnızca **motorun kendi yaptığı taşımalar** tersine
çevrilir.

Taşımalar neden silinmiyor da geri taşınıyor: silmek çift route sorununu çözerdi ama
`--force` ile kirli ağaçta çalışan kullanıcının o dosyalardaki **commit edilmemiş
değişikliklerini** de yok ederdi. Geri taşımak ikisini birden çözer.

### `--force` ile kirli ağaçta

Ağaçta commit edilmemiş **izlenen** değişiklik varsa hata durumunda **otomatik geri alma
yapılmaz** — yapılsaydı sizin işinizi de silerdi. Yalnızca taşımalar geri alınır ve motor
size elle geri alma komutunu söyler. Değişiklikler diskte durur.

---

## Tuzaklar

**Ön ek çakışması.** `// @feature:team` ile `// @feature:teams` ayrı adlardır ve motor
bunları karıştırmaz — ama iki özelliğin adını birbirinin ön eki yapmak okuyan insanı
yanıltır. Kaçının.

**İç içe farklı marker'lar.** Bir `blog` bloğunun içinde bir `i18n` satır marker'ı olabilir;
`blog` çıkarıldığında blok komple gider, `i18n` çıkarıldığında yalnızca o satır gider.
İkisi de doğru çalışır. Fakat **iki bloğun kesişmesi** (A açılır, B açılır, A kapanır,
B kapanır) tanımsızdır — bloklar ya iç içe ya ayrık olmalı.

**Ölü kod uyarısı (ts 6133).** Bir değişken yalnızca bir marker bloğunun içinde
kullanılıyorsa, **tanımı da** o bloğun içinde olmalı. Dışarıda kalırsa özellik çıkarıldığında
"declared but never read" hatası çıkar ve `astro check` kırılır. `MetaTags.astro` ve
`Header.astro` bu yüzden `alternates` prop'unu marker bloğunun içinde okur.

**Tip daralması.** Bir dil ya da varyant çıkarıldığında ilgili birleşim tipi daralır.
`Header.astro` içindeki `const otherLocale: Locale = locale === 'tr' ? 'en' : 'tr'` satırı
marker bloğunun içindedir; dışarıda kalsaydı `i18n` çıkarıldıktan sonra `'en'` artık geçerli
bir `Locale` olmadığı için tip hatası verirdi.

**Build yeşil geçebilir.** `astro build` tip hatalarını görmez ve kırık iç linkleri
görmez. Bir çıkarmanın tüm iç linkleri sessizce 404 yaptığı bir vaka gerçekten yaşandı ve
build yeşildi. Bu yüzden matris **üç** adımı birden koşar (`check` + `build` + `test`);
kendi doğrulamanızda da üçünü koşun.

---

## Bilinen sınırlar

- **`bun.lock`**: bağımlılık budama yalnızca `package.json`'ı düzenler. Varsayılan
  yolda zararsızdır (`bun install` lock'u uzlaştırır), ama `--no-install` ile çıkarma
  yaparsanız `package.json` ile lock uyuşmaz kalır ve `bun install --frozen-lockfile` reddeder. Çözüm: sonrasında
  `bun install` çalıştırın.
- **`src/i18n/*.json` içindeki kullanılmayan anahtarlar** çıkarma sonrası yerinde kalır
  (JSON yorum desteklemez, dolayısıyla marker'lanamaz). Build'i etkilemez.
- **Matris kapsamı**: 1023 alt kümeden 14'ü sınanır (yukarıdaki).

---

## Wizard-driven generation

Şablonu klonlayıp özellik çıkarmak yerine, istediğiniz alt kümeyle **temiz** bir proje
üretebilirsiniz. Sihirbaz kendi silme mantığını yazmaz: şablonu kopyalar, sonra
seçilmeyenleri aynı motora çıkartır.

```bash
cd scripts/create-cli && bun install && cd ../..     # ZORUNLU — atlanmamalı
node scripts/create-cli/index.mjs my-landing
```

> **Neden zorunlu:** sihirbaz `@clack/prompts` paketini import eder ve o bağımlılık
> `scripts/create-cli/node_modules` altında durur, şablonun kendi ağacında **değil**. Kurulum
> yapmadan `node scripts/create-cli/index.mjs` demek yalnızca Node'un yukarı doğru çözümlemesi
> sayesinde (şablonun ağacında tesadüfen bir kopya varsa) **kazara** çalışabilir. Temiz bir
> klonda `ERR_MODULE_NOT_FOUND` alırsınız.

### Flags

Verilmeyen her değer soru olarak sorulur.

| Bayrak                | Anlamı                                                                               |
| --------------------- | ------------------------------------------------------------------------------------ |
| `--name=<ad>`         | `package.json` adı (geçerli npm paket adı olmalı).                                   |
| `--features=a,b,c`    | **Dahil edilecek** özellikler, virgüllü. Bilinmeyen ad reddedil.                     |
| `--all`               | Tüm isteğe bağlı özellikler dahil.                                                   |
| `--minimal`           | Hiçbir isteğe bağlı özellik yok.                                                     |
| `--lang=tr\|en\|both` | Dil modu. Varsayılan `tr`.                                                           |
| `--pm=npm\|pnpm\|bun` | Paket yöneticisi. Varsayılan `bun`.                                                  |
| `--no-git`            | Üretilen projede git deposu başlatma.                                                |
| `--no-verify`         | Üretilen projede `check` + `test` + `build` doğrulamasını atla.                      |
| `--yes`               | Kalan soruları sorma, varsayılanları kullan. Hedef klasör argümanı **zorunlu** olur. |
| `--help`, `-h`        | Kullanım metnini bas.                                                                |

`--all` ve `--minimal` birlikte kullanılamaz. Bilinmeyen bir bayrak sessizce yutulmaz,
hata verir.

Örnekler:

```bash
node scripts/create-cli/index.mjs my-landing --yes --all --lang=both
node scripts/create-cli/index.mjs my-landing --yes --minimal --lang=en --no-git
node scripts/create-cli/index.mjs my-landing --yes --features=blog,forms,pricing --pm=pnpm
```

### Dil modları

- `both` — `i18n` korunur; proje `/tr/` ve `/en/` ile gelir.
- `tr` — `i18n` çıkarılır, Türkçe taraf köke iner.
- `en` — `i18n` çıkarılır **ama** İngilizce içerik önce "hayatta kalan yuvaya" taşınır.
  Çıkarma tek yönlüdür (EN tarafını siler, TR'yi bırakır), bu yüzden sihirbaz veri
  dosyalarını, sözlüğü, blog yazılarını (frontmatter `locale` alanı dahil) ve lokalize
  slug'ları çıkarmadan **önce ve sonra** yeniden etiketler.

### Garantiler

- Hata, iptal ya da sinyal durumunda **hedef klasör geride bırakılmaz**. Klasörü siz önceden
  oluşturmuşsanız içi boşaltılır, klasörün kendisi silinmez.
- Hedef klasör şablonun **içinde** olamaz.
- Var olan ve boş olmayan bir klasöre üretim yapılmaz.
- Üretilen projeye **kopyalanmayanlar**, şablonun kendi `.gitignore`'ından türetilir
  (`node_modules/`, `dist/`, `.astro/`, `.wrangler/`, `.env` ve `.env.*` …). `!` ile yazılmış
  olumsuzlama kuralları da uygulanır — `.gitignore`'daki `!.env.example` satırı yüzünden
  depoya böyle bir dosya eklerseniz üretilen projeye de girer. Buna ek olarak `.git` ve `scripts/create-cli/` de kopyalanmaz (proje üretmek şablonun
  işi, üretilmiş projenin değil). **`.gitignore`'a bir satır eklemek sihirbazı da otomatik
  kapsar; bir satır silmek o dosyanın üretilen projeye girmesine izin verir.**
- `docs/` **kopyalanır** — bu belgeler üretilen projenin de referansıdır (kapsam uyarısı
  için bkz. [docs/README.md](./README.md)).
- `--pm=pnpm` seçilirse `.github/` (CI iş akışı bun/npm'e özgüdür — sihirbaz bunu uyarı olarak
  söyler) ve `bun.lock` kopyalanmaz.

### `.gitignore` türetmesinin sınırları

Tek liste tutulmuyor olması ucuz değil: sihirbaz `.gitignore`'ı **kendi** ayrıştırıcısıyla
okur (`scripts/create-cli/index.mjs` → `readGitignoreRules`), git'i çağırmaz. Desteklenen sözdizimi:

| Biçim                             | Anlamı                                                                    |
| --------------------------------- | ------------------------------------------------------------------------- |
| `#` ile başlayan satır, boş satır | atlanır                                                                   |
| `*`                               | tek segment içinde herhangi bir dizi (`/` geçmez)                         |
| `?`                               | tek segment içinde tek karakter                                           |
| `**`                              | segment sınırını aşar (`a/**/b`); desenin sonundaysaki "gerisi ne olursa" |
| sondaki `/`                       | yalnızca **dizin** eşleşir                                                |
| baştaki `/` ya da içinde `/`      | köke **sabitli**; aksi halde her seviyede eşleşir                         |
| `!`                               | olumsuzlama (`!.env.example`)                                             |

Git'in semantiği korunur: **son eşleşen kural kazanır.**

**Karakter sınıfı desteklenmiyor.** `.gitignore`'ınıza `*.[oa]` gibi bir satır eklerseniz
sihirbaz sessizce yanlış yorumlamak yerine **gürültülü ölür**:

```
.gitignore deseni desteklenmiyor (karakter sınıfı): *.[oa]
  scripts/create-cli/index.mjs içindeki `gitignoreToRegExpBody` genişletilmeli.
```

Bu bilinçli: yanlış yorumlanan bir desen = dosyanın kopyalanması = tam olarak önlenmek
istenen sızıntı. Aynı sertlik `.gitignore` okunamadığında ve dosyadan hiç kural
çıkarılamadığında da geçerlidir — sihirbaz "hiçbir şey dışlama"ya düşmez, durur.

### Yayınlanmış paket olarak

`scripts/create-cli/package.json` bir `bin` girdisi taşır, ancak `files: ["index.mjs"]` yayınlanan
tarball'a şablonun kendisini koymaz. Sihirbaz **checkout'tan** çalışacak şekilde tasarlandı;
`npm create` yolu bugün desteklenmiyor.
