/**
 * Çıkarma matrisi — şablonun ANA VAADİNİN otomatik testi.
 *
 * Her kombinasyon için: projenin geçici bir KOPYASINDA özellikleri çıkarır, sonra
 * `astro check` + `astro build` + `vitest run` çalıştırır. Üçü de şart:
 *
 * - `build` tek başına TİP hatalarını görmez (Astro derlerken tip denetlemez) — bir çıkarma
 *   tüm iç linkleri sessizce 404 yapabilir ve build yine de yeşil kalır.
 * - `check` tek başına TESTLERİ görmez — bir özellik çıkarıldığında ona bağlı test
 *   assertion'ları da marker'la sökülmelidir; sökülmezse üretilmiş projede suite kırık gelir
 *   (elle yapılan strip denemeleri bu açığı test hatalarıyla ortaya çıkarmıştı).
 * - `test` tek başına derlenmeyen şablonu görmez.
 *
 * Çalışma ağacına DOKUNMAZ: her kombinasyon kendi geçici klasöründe koşar.
 *
 * KAPSAM SINIRI: 10 özelliğin 1023 alt kümesi var; matris bunların 14'ünü koşar (her özellik
 * tek tek, elle seçilmiş 3 etkileşim, hepsi birden). Yani "matris yeşil" = "sınanan
 * kombinasyonlar sağlam", "her kombinasyon sağlam" DEĞİL. Seçim gerekçeleri aşağıda,
 * `combos` tanımının yanında.
 *
 * Kullanım:
 *   bun run test:removal                 # tüm matris (hızlı yol: node_modules hardlink'lenir)
 *   bun run test:removal -- --only=blog  # etiketi eşleşen kombinasyonlar
 *   bun run test:removal -- --install    # her kombinasyonda GERÇEK `bun install` (yavaş, derin)
 *   bun run test:removal -- --keep       # başarısız kombinasyonların klasörünü silme
 */
import { spawnSync } from 'node:child_process';
import {
  constants,
  cpSync,
  existsSync,
  linkSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { glob } from 'tinyglobby';
import { features } from '../features.manifest';
import { SWEEP_GLOBS, SWEEP_IGNORE } from './lib/markers';

const root = resolve(import.meta.dirname, '..');
const allFeatures = Object.keys(features);

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--') && !a.includes('=')));
const only = args.find((a) => a.startsWith('--only='))?.slice('--only='.length);
// `--only=` (boş değer) tüm matrisi sessizce koştururdu: kullanıcı tek kombinasyon beklerken
// 4 dakika bekler. Bilinmeyen bayrakla aynı sınıf hata, aynı şekilde gürültülü reddediliyor.
if (only === '') {
  console.error('✖ `--only=` boş bırakılamaz. Örnek: --only=blog');
  process.exit(1);
}

// Yazım hatası sessizce yutulmamalı: `--instal` yazan biri kendini derin modda sanır ve
// aslında hiçbir şey değişmemiş olur.
const KNOWN_FLAGS = new Set(['--install', '--keep']);
const unknown = args.filter((a) => !KNOWN_FLAGS.has(a) && !a.startsWith('--only='));
if (unknown.length > 0) {
  console.error(`✖ Bilinmeyen argüman: ${unknown.join(', ')}`);
  console.error(`  Kullanılabilir: ${[...KNOWN_FLAGS].join(', ')}, --only=<etiket parçası>`);
  process.exit(1);
}

// --- kombinasyonlar ----------------------------------------------------------------------------
// Tek tek her özellik + elle seçilmiş etkileşimler + hepsi birden.
const combos: string[][] = [
  ...allFeatures.map((feature) => [feature]),
  // i18n dosya TAŞIR (`src/pages/tr/**` → `src/pages/`); blog ve dark-mode taşıma SONRASI
  // yerleşimde temizlenmek zorunda. Motorun en genç yeteneği burada sınanıyor.
  ['i18n', 'dark-mode', 'blog'],
  // Üç bağımsız "widget" özelliği: ortak veri index'lerinde ve BaseLayout'ta üst üste biner.
  ['analytics', 'forms', 'newsletter'],
  // TERS SIRA: i18n EN SONDA. Yukarıdaki ve HEPSİ kombinasyonlarında i18n hep ÖNCE çıkıyor,
  // yani taşıma öncesi yerleşim (`src/pages/tr/blog`) hiç sınanmıyordu. Manifest her iki
  // yerleşimi de listeliyor; bu kombinasyon ikinci dalın gerçekten çalıştığını doğrular.
  ['blog', 'forms', 'i18n'],
  allFeatures,
];

const labelOf = (combo: string[]): string =>
  combo.length === allFeatures.length ? 'HEPSİ' : combo.join('+');

const selected = combos.filter((c) => !only || labelOf(c).includes(only));
if (selected.length === 0) {
  console.error(`✖ "--only=${only}" hiçbir kombinasyonla eşleşmedi.`);
  process.exit(1);
}

// --- geçici klasör -----------------------------------------------------------------------------
// Kopyalar SİSTEM tmp'sine değil, proje kökünün ALTINA açılıyor. Sebep tek: `node_modules`
// hardlink'le çoğaltılıyor ve hardlink DOSYA SİSTEMİ SINIRINI GEÇEMEZ (EXDEV). /tmp çoğu
// makinede ayrı bir birim (bu projede kök harici bir APFS diskte, CI'da tmpfs).
const tmpBase = join(root, '.removal-tmp');

// Kopyalanmayanlar: türetilmiş çıktı, VCS, editör/ajan durumu ve matrisin kendi klasörü.
const SKIP_DIRS = new Set([
  'node_modules',
  '.removal-tmp',
  'dist',
  '.git',
  '.astro',
  '.wrangler',
  '.superpowers',
  '.claude',
  'create-cli',
]);

/**
 * `node_modules`i HARDLINK'le çoğaltır.
 *
 * NEDEN SYMLINK DEĞİL: `node_modules`i tek bir symlink yapmak (ya da girdi girdi symlink'lemek)
 * Astro 7'de build'i KIRIYOR — ölçüldü. Vite symlink'leri gerçek yola çözdüğü için
 * `astro/components/ClientRouter.astro` modül kimliği GERÇEK depo yoluna dönüşüyor, sonra
 * geçici köke göre yeniden birleştiriliyor ve derleyici kendi meta verisini bulamıyor:
 * "No cached compile metadata found for .../ClientRouter.astro". Yani brief'in symlink
 * önerisi bu şablonda çalışmıyor.
 *
 * NEDEN TAM KOPYA DEĞİL: 525MB × kombinasyon sayısı. Hardlink ~5sn, gerçek kopya kat kat fazla.
 *
 * NEDEN GÜVENLİ: hardlink İÇERİĞİ paylaşır, DİZİNİ paylaşmaz. Build'in `node_modules` içine
 * yazdığı her şey (`.astro`, `.vite`, `.vite-temp` önbellekleri) YENİ dosya olarak geçici
 * kopyada doğar; gerçek depodaki paket dosyalarına dokunulmaz (ampirik olarak doğrulandı).
 * Nokta ile başlayan mevcut önbellek girdileri zaten hiç bağlanmıyor — böylece her
 * kombinasyon TEMİZ önbellekle başlar ve bir öncekinin içerik/tip önbelleğini miras almaz.
 */
function linkNodeModules(source: string, destination: string): void {
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const to = join(destination, entry.name);
    if (entry.isDirectory()) {
      linkNodeModules(from, to);
    } else if (entry.isSymbolicLink()) {
      // `.bin/*` göreli symlink'lerdir (`../astro/astro.js`); birebir kopyalanınca GEÇİCİ
      // kopyanın içine çözülürler. Hedefi çözerek kopyalamak gerçek depoya geri bağlardı.
      cpSync(from, to, { verbatimSymlinks: true });
    } else {
      linkSync(from, to);
    }
  }
}

/**
 * Proje ağacını kopyalar (SKIP_DIRS hariç).
 *
 * `cpSync(root, dir)` KULLANILAMIYOR: hedef kaynağın altında olduğu için Node filtreye hiç
 * bakmadan `ERR_FS_CP_EINVAL` fırlatıyor. Hedefin kök altında olması ise şart (hardlink,
 * bkz. `tmpBase`), dolayısıyla yürüyüşü elle yapıyoruz.
 */
function copyTree(source: string, destination: string): void {
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    // Yol PARÇASI karşılaştırması köke GÖRE yapılır. Mutlak yolun tamamına bakmak, deponun
    // üstünde `dist` adlı bir klasör varsa her şeyi eleyecek sessiz bir tuzaktı.
    if (
      relative(root, from)
        .split(sep)
        .some((segment) => SKIP_DIRS.has(segment))
    )
      continue;
    const to = join(destination, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else cpSync(from, to, { verbatimSymlinks: true });
  }
}

function prepare(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
  copyTree(root, dir);

  const source = join(root, 'node_modules');
  const nodeModules = join(dir, 'node_modules');
  try {
    mkdirSync(nodeModules);
    for (const entry of readdirSync(source, { withFileTypes: true })) {
      // `.astro`/`.vite`/`.vite-temp`/`.mf`/`.package-lock.json`: gerçek deponun önbellek ve
      // kurulum durumu. Taşınırlarsa kombinasyonlar birbirinin içerik önbelleğini görür.
      if (entry.name.startsWith('.') && entry.name !== '.bin') continue;
      const from = join(source, entry.name);
      const to = join(nodeModules, entry.name);
      if (entry.isDirectory()) linkNodeModules(from, to);
      else if (entry.isSymbolicLink()) cpSync(from, to, { verbatimSymlinks: true });
      else linkSync(from, to);
    }
  } catch (error) {
    // Hardlink desteklenmeyen bir dosya sisteminde (bazı konteyner katmanları, ağ birimleri)
    // EXDEV/EPERM/ENOTSUP gelir. Matrisin ham bir hata mesajıyla ölmesindense yavaşlaması
    // yeğdir: COPYFILE_FICLONE destekleyen dosya sisteminde reflink, desteklemeyende gerçek
    // kopya yapar — ikisi de doğru, sadece daha pahalı.
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'EXDEV' && code !== 'EPERM' && code !== 'ENOTSUP') throw error;
    console.warn(`  (hardlink yok — ${code}; tam kopyaya düşülüyor, yavaş)`);
    rmSync(nodeModules, { recursive: true, force: true });
    cpSync(source, nodeModules, {
      recursive: true,
      verbatimSymlinks: true,
      mode: constants.COPYFILE_FICLONE,
      filter: (src) => {
        const name = relative(source, src).split(sep)[0];
        return name === '' || !name.startsWith('.') || name === '.bin';
      },
    });
  }
}

// --- adım çalıştırma ---------------------------------------------------------------------------
interface StepResult {
  ok: boolean;
  output: string;
  seconds: number;
}

function run(command: string, commandArgs: string[], cwd: string): StepResult {
  const started = Date.now();
  const result = spawnSync(command, commandArgs, {
    // Windows'ta `npm`/`pnpm` bir .cmd shim'idir ve shell olmadan bulunamaz. (`bun` ise
    // .exe tek-exe; shell'e ihtiyaç duymaz ama yine de shell=true zarar vermez.)
    shell: process.platform === 'win32',
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    // CI=1: vitest/bun etkileşimli moda geçmesin, renk kaçış dizileri log'u kirletmesin.
    env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
  });
  return {
    ok: result.status === 0,
    // Astro build hatalarını STDOUT'a yazar, vitest STDERR'e. Yalnızca stderr'i basmak
    // (brief'in taslağı böyle yapıyordu) build hatalarını GÖRÜNMEZ kılardı.
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    seconds: (Date.now() - started) / 1000,
  };
}

/**
 * Budanmış bağımlılıklara SARKAN referans kalmadığını doğrular.
 *
 * Hızlı yolda `node_modules` gerçek depodan hardlink'lendiği için budanan paketler DİSKTE
 * durmaya devam eder: `blog` çıkarıldıktan sonra `@astrojs/rss`e yapılan bir import build'de
 * yine ÇÖZÜLÜR ve matris yeşil geçerdi — ama şablonu indiren kullanıcı `bun install` yapınca
 * kırılırdı. Bu statik kontrol tam o boşluğu kapatır. (`--install` ile koşulduğunda kontrol
 * gereksizdir ama zararsızdır.)
 */
async function checkPrunedDependencies(dir: string, combo: string[]): Promise<string[]> {
  const pruned = combo.flatMap((name) => features[name].dependencies ?? []);
  if (pruned.length === 0) return [];

  const problems: string[] = [];
  // BİLİNEN KÖR NOKTA: budama yalnızca package.json'ı düzenliyor, package-lock.json'da paket
  // kalıyor. Varsayılan yolda zararsız (çıkarma ardından `bun install` çalıştırıp lock'u
  // uzlaştırıyor), ama `--no-install` ile çıkarma yapan kullanıcıda package.json/lock uyumsuz
  // kalır ve `bun install --frozen-lockfile` reddeder. Matris her zaman `--no-install`
  // kullandığı için bunu GÖREMEZ.
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  for (const dep of pruned) {
    if (pkg.dependencies?.[dep] || pkg.devDependencies?.[dep]) {
      problems.push(`package.json hâlâ "${dep}" içeriyor`);
    }
  }

  const files = await glob(SWEEP_GLOBS, { cwd: dir, ignore: SWEEP_IGNORE });
  for (const file of files) {
    const content = readFileSync(join(dir, file), 'utf8');
    for (const dep of pruned) {
      // Kasten SUBSTRING araması: import mu, yorum mu, string mi ayırt etmiyor. Yanlış pozitif
      // (paketi anan masum bir yorum) matrisi kırar, ama yanlış NEGATİF sarkan bir import'u
      // kullanıcıya kadar taşır. Bu takasta gürültülü olan taraf doğru taraf.
      if (content.includes(dep)) problems.push(`${file}: budanmış "${dep}" hâlâ referanslı`);
    }
  }
  return problems;
}

// --- matris ------------------------------------------------------------------------------------
interface ComboReport {
  label: string;
  ok: boolean;
  seconds: number;
  failedStep?: string;
}

console.log(`Çıkarma matrisi: ${selected.length} kombinasyon`);
console.log(`Özellikler (${allFeatures.length}): ${allFeatures.join(', ')}`);
console.log(flags.has('--install') ? 'Mod: GERÇEK bun install (yavaş)' : 'Mod: hardlink node_modules');
console.log('');

// Yarıda kesilmiş (Ctrl-C) bir koşudan kalan klasörler diskte GB'larca yer tutabilir; `--keep`
// ile bilerek bırakılanlar dahil, her koşu temiz bir zeminde başlar.
rmSync(tmpBase, { recursive: true, force: true });
mkdirSync(tmpBase, { recursive: true });
const reports: ComboReport[] = [];
const matrixStarted = Date.now();

for (const combo of selected) {
  const label = labelOf(combo);
  // Etiket dosya adı olarak kullanılıyor; `+` güvenli ama uzun HEPSİ etiketi değil.
  const dir = join(tmpBase, `combo-${label.replace(/[^\w+-]/g, '_')}`);
  const comboStarted = Date.now();
  let failedStep: string | undefined;

  process.stdout.write(`→ ${label} ... `);
  try {
    prepare(dir);

    const steps: Array<[string, () => StepResult]> = [
      [
        'remove',
        () =>
          run(
            'bun',
            [
              'run',
              'remove',
              '--',
              ...combo,
              // --force: kopyada `.git` yok, motor geri alma için git ister.
              '--force',
              // --no-install: bağımlılık budama diskteki hardlink ağacını değiştirmesin.
              '--no-install',
              // --no-verify: doğrulamayı motora değil, aşağıdaki üç adıma yaptırıyoruz.
              '--no-verify',
            ],
            dir,
          ),
      ],
      ...(flags.has('--install')
        ? ([['bun install', () => run('bun', ['install'], dir)]] as Array<[string, () => StepResult]>)
        : []),
      ['astro check', () => run('bun', ['run', 'check'], dir)],
      ['astro build', () => run('bun', ['run', 'build'], dir)],
      // `bun test` (boşluksuz) bun'un KENDİ runner'ı — vitest `vi.*` global'lerini
      // tanımaz; matrisin her kombinasyonunda kırmızı dönerdi. `bun run test` ise
      // package.json'daki `vitest run` script'ini çağırır.
      ['vitest', () => run('bun', ['run', 'test'], dir)],
    ];

    for (const [name, step] of steps) {
      const result = step();
      if (!result.ok) {
        failedStep = name;
        console.log(`✖ (${name})`);
        console.error(`\n--- ${label} / ${name} çıktısı ---`);
        console.error(result.output.trimEnd());
        console.error(`--- ${label} / ${name} sonu ---\n`);
        break;
      }
    }

    if (!failedStep) {
      const problems = await checkPrunedDependencies(dir, combo);
      if (problems.length > 0) {
        failedStep = 'bağımlılık budama';
        console.log('✖ (bağımlılık budama)');
        for (const problem of problems) console.error(`  ${problem}`);
      }
    }

    if (!failedStep) console.log(`✔ (${((Date.now() - comboStarted) / 1000).toFixed(1)}sn)`);
  } catch (error) {
    failedStep = 'hazırlık';
    console.log('✖ (hazırlık)');
    console.error(error);
  } finally {
    if (failedStep && flags.has('--keep')) {
      console.error(`  (klasör korundu: ${dir})`);
    } else {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  reports.push({
    label,
    ok: !failedStep,
    seconds: (Date.now() - comboStarted) / 1000,
    failedStep,
  });
}

// `.removal-tmp` boşsa arkada bırakma.
if (existsSync(tmpBase) && readdirSync(tmpBase).length === 0) rmSync(tmpBase, { recursive: true });

// --- özet --------------------------------------------------------------------------------------
const total = (Date.now() - matrixStarted) / 1000;
const failedReports = reports.filter((r) => !r.ok);
const width = Math.max(...reports.map((r) => r.label.length));

console.log('\n--- Özet ---');
for (const report of reports) {
  const mark = report.ok ? '✔' : '✖';
  const suffix = report.ok ? '' : `  ← ${report.failedStep}`;
  console.log(`${mark} ${report.label.padEnd(width)}  ${report.seconds.toFixed(1).padStart(5)}sn${suffix}`);
}
console.log(
  `\n${reports.length - failedReports.length}/${reports.length} kombinasyon geçti — ${total.toFixed(1)}sn`,
);

if (failedReports.length > 0) {
  console.error(`✖ Başarısız: ${failedReports.map((r) => r.label).join(', ')}`);
  process.exit(1);
}

// NOT: burada eskiden bir `require.resolve` "bütünlük kontrolü" vardı. Kaldırıldı — tek bir
// yolun çözülmesi İÇERİĞİN değişmediğini kanıtlamıyordu, üstelik yalnızca başarı yolunda
// çalışıyordu (bozulmanın daha olası olduğu başarısızlık yolunda atlanıyordu). Gerçek güvence
// mekanizmada: nokta ile başlayan girdiler (`.vite`, `.cache`) hiç bağlanmıyor, `.bin`
// sembolik linkleri olduğu gibi kopyalanıyor — yani build çıktısı gerçek node_modules'a
// ULAŞAMIYOR. Bkz. copyNodeModules.
console.log('✔ Tüm kombinasyonlar geçti.');
