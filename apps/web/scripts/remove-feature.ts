import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { glob } from 'tinyglobby';
import { features } from '../features.manifest';
import { applyPatterns, stripFeature, SWEEP_GLOBS, SWEEP_IGNORE } from './lib/markers';
import { applyMoves, revertMoves, type MoveRule } from './lib/moves';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const names = args.filter((a) => !a.startsWith('--'));

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

if (names.length === 0) {
  console.log('Kullanım: bun run remove -- <özellik...> [--force] [--no-install] [--no-verify]');
  console.log('Özellikler:');
  for (const [name, def] of Object.entries(features)) console.log(`  ${name.padEnd(14)} ${def.description}`);
  process.exit(0);
}

for (const name of names) {
  if (!features[name]) fail(`Bilinmeyen özellik: "${name}". Mevcutlar: ${Object.keys(features).join(', ')}`);
}

const hasGit = existsSync('.git');
// Guard için HER TÜRLÜ kirlilik sayılır (izlenmeyen dosyalar dahil); ama yalnızca İZLENEN
// kirlilik geri almayı tehlikeli yapar, çünkü `git reset --hard` sadece izlenen dosyalara dokunur.
const treeDirty = hasGit && execSync('git status --porcelain').toString().trim() !== '';
const trackedDirty =
  hasGit && execSync('git status --porcelain --untracked-files=no').toString().trim() !== '';
if (!flags.has('--force')) {
  if (!hasGit) fail('Git deposu yok. Geri alma için git gerekli; yine de devam etmek için --force kullanın.');
  if (treeDirty) {
    fail(
      'Çalışma ağacı temiz değil. Önce commit edin veya `git stash` ile kenara alın.\n' +
        '  (--force ile yine de çalıştırabilirsiniz; ama commit edilmemiş DEĞİŞİKLİKLERİNİZ varken\n' +
        '   hata durumunda otomatik geri alma YAPILMAZ — geri alma onları da silerdi.)',
    );
  }
}

// package.json geri alındığında node_modules onunla eşitlenmez (kaldırılan bağımlılıklar
// `bun install` ile silinmiş olur); bu yüzden install çalıştıysa geri almadan sonra tekrar
// install ediyoruz.
let installed = false;

// Uygulanan taşımalar. Taşınan dosyalar hedefte İZLENMEYEN kopyalardır, yani `git reset --hard`
// onları geri alamaz (geri alınmazsa hem `src/pages/tr/index.astro` hem `src/pages/index.astro`
// bulunur — ÇİFT route). `git clean -fd` de kullanılmıyor: kullanıcının kendi izlenmeyen
// dosyalarını da silerdi. Bunun yerine yalnızca motorun kendi taşımaları tersine çevriliyor
// (bkz. `revertMoves`, `scripts/lib/moves.ts`).
const appliedMoves: MoveRule[] = [];

// Değiştirilen dosyalar. Süpürmenin sonunda prettier bunların üstünden geçer; aksi halde
// `dark:` sınıfları söküldükten sonra kısa kalan nesneler çok satıra yayılır ve `format:check`
// kırmızı döner (CI kapısı — bkz. .prettierignore).
const modifiedFiles = new Set<string>();

function rollback(): void {
  if (!hasGit) {
    console.error('✖ Git yok — otomatik geri alma yapılamadı, değişiklikler diskte kaldı.');
    return;
  }
  if (trackedDirty) {
    // İzlenen dosyalara DOKUNMUYORUZ (kullanıcının commit edilmemiş işi gider), ama taşımaları
    // geri alıyoruz — aksi halde kullanıcı elle `git reset --hard` çalıştırdığında izlenen
    // orijinaller geri gelir ve taşınmış kopyaların YANINDA durur (çift route).
    revertMoves(appliedMoves);
    console.error('✖ Ağaçta commit edilmemiş değişiklikler vardı (--force): onları silmemek için');
    console.error('  otomatik geri alma YAPILMADI. Değişiklikler diskte duruyor.');
    if (appliedMoves.length > 0) {
      console.error('  (Taşımalar geri alındı; o dosyalardaki değişiklikleriniz de korundu.)');
    }
    console.error('  Elle geri almak için: git reset --hard   (kendi değişiklikleriniz de gider)');
    return;
  }
  console.error('→ değişiklikler geri alınıyor...');
  // Sıra ÖNEMLİ: önce taşımalar tersine çevrilir, sonra reset izlenen dosyaları eski hâline
  // döndürür. Ters sırada olsaydı reset, taşınmış izlenmeyen kopyaları göremezdi.
  revertMoves(appliedMoves);
  execSync('git reset --hard', { stdio: 'inherit' });
  if (installed) {
    console.error('→ node_modules geri alınan package.json ile eşitleniyor...');
    execSync('bun install', { stdio: 'inherit' });
  }
}

try {
  for (const name of names) {
    const def = features[name];
    console.log(`→ ${name} çıkarılıyor...`);

    for (const pattern of def.files ?? []) {
      const matches = pattern.includes('*') ? await glob(pattern, { onlyFiles: false }) : [pattern];
      for (const path of matches) {
        if (existsSync(path)) {
          rmSync(path, { recursive: true, force: true });
          console.log(`  sil: ${path}`);
        }
      }
    }

    // Taşımalar silmeden SONRA, süpürmeden ÖNCE: silme çakışacak dosyaları (kök `index.astro`)
    // ortadan kaldırır; süpürme ise dosyaları YENİ yerlerinde bulmalı.
    for (const move of applyMoves(def.moves ?? [])) {
      appliedMoves.push(move);
      console.log(`  taşı: ${move.from} → ${move.to}`);
    }

    // Süpürme kapsamı motorun dışında tanımlı: çıkarma matrisi testi ve create-cli aynı sabiti kullanır.
    const sweepFiles = await glob(SWEEP_GLOBS, { ignore: SWEEP_IGNORE });
    for (const file of sweepFiles) {
      const before = readFileSync(file, 'utf8');
      let after: string;
      try {
        after = stripFeature(before, name);
      } catch (error) {
        throw new Error(`${file}: ${(error as Error).message}`);
      }
      if (after !== before) {
        writeFileSync(file, after);
        modifiedFiles.add(file);
        console.log(`  marker: ${file}`);
      }
    }

    for (const pattern of def.patterns ?? []) {
      const files = await glob(pattern.glob, { ignore: ['node_modules/**'] });
      for (const file of files) {
        const before = readFileSync(file, 'utf8');
        const after = applyPatterns(before, [pattern]);
        if (after !== before) {
          writeFileSync(file, after);
          modifiedFiles.add(file);
          console.log(`  desen: ${file}`);
        }
      }
    }

    if (def.dependencies?.length) {
      const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
      for (const dep of def.dependencies) {
        delete pkg.dependencies?.[dep];
        delete pkg.devDependencies?.[dep];
        console.log(`  bağımlılık: ${dep}`);
      }
      writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    }
  }

  if (!flags.has('--no-verify')) {
    if (!flags.has('--no-install')) {
      // Bayrak install'dan ÖNCE set edilir: `bun install` kendisi patlarsa node_modules yarı
      // budanmış kalır ve geri almanın onu eşitlemesi TAM O ZAMAN gerekir.
      installed = true;
      execSync('bun install', { stdio: 'inherit' });
    }
    // Değişen dosyalar prettier'dan geçirilir; `.prettierignore` zaten sözleşmeyi koruyan
    // satır-marker dosyalarını dışarıda bırakıyor. `format:check` CI kapısı; burada
    // formatlanmazsa çıkarma sonrası push kırmızı döner.
    if (modifiedFiles.size > 0) {
      try {
        execSync(`bunx --no-install prettier --write ${[...modifiedFiles].map((f) => `"${f}"`).join(' ')}`, {
          stdio: 'inherit',
        });
      } catch {
        // prettier yoksa/başarısızsa build yine de koşsun; kullanıcıya CI'ın
        // kırmızı döneceğini sarı uyarı olarak bırakıyoruz.
        console.warn('⚠ prettier çalıştırılamadı; `bun run format` el ile gerekebilir.');
      }
    }
    console.log('→ build ile doğrulanıyor...');
    execSync('bun run build', { stdio: 'inherit' });
  }
  console.log(`✔ Çıkarıldı: ${names.join(', ')}`);
} catch (error) {
  // Ham `throw` tüm stack trace'i dökerdi; kullanıcı için gürültü. Sebebi tek satırda söyleyip
  // temiz çıkıyoruz (exit kodu yine 1).
  console.error(`✖ Çıkarma başarısız: ${error instanceof Error ? error.message : String(error)}`);
  rollback();
  process.exitCode = 1;
}
