/**
 * `wrangler.toml` → `.env` eşitleyicisi. Şablonun TEK DOĞRULUK KAYNAĞI `wrangler.toml`; Astro
 * ise build'de `.env`'i okuyup `PUBLIC_*` anahtarlarını `import.meta.env` ile client bundle'a
 * enjekte eder. Bu script köprü: build öncesi `[vars]` bölümünü okur, `.env` YAZAR; build
 * sonrası `.env` silinir (gitignored). `bun run build` bunu astro'dan ÖNCE çağırır (`prebuild`).
 *
 * NEDEN `smol-toml`: `PUBLIC_FORMS_ENDPOINT` gibi değerler `https://…` ve `#` içerebilir; satır
 * satır regex'ler tırnak içi `#`'i yorum sanıp değeri keser. Gerçek bir TOML ayrıştırıcısı bunu
 * doğru yapar ve hatalı dosyada satır numarasıyla hata verir.
 */

import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { readWranglerVars } from './lib/wrangler-vars';

const root = resolve(import.meta.dirname, '..');
const wranglerPath = resolve(root, 'wrangler.toml');
const envPath = resolve(root, '.env');

function main(): void {
  const vars = readWranglerVars(wranglerPath);

  // .env dosyası build artifaktıdır; .gitignore'da zaten listelenmiş olmalı.
  // Yeniden yaz: eski build artığı varsa üzerine yaz (birikme).
  const lines = [
    '# Bu dosya scripts/sync-wrangler-env.ts tarafından ÜRETİLİR. Elle düzenleme — build sırasında',
    '# ezilir. Tek doğruluk kaynağı: wrangler.toml `[vars]` bölümü.',
    '',
    ...Object.entries(vars).map(([key, value]) => `${key}=${value}`),
  ];
  writeFileSync(envPath, `${lines.join('\n')}\n`);

  // Üretimde `.env` gizli değer taşımaz (PUBLIC_* önekli olanlar client bundle'a sızar,
  // public'tir), ama yine de repoda TURMAZDIK: dağıtım artifaktı.
  console.log(`✓ wrangler.toml → .env (${Object.keys(vars).length} anahtar)`);
}

try {
  main();
} catch (error) {
  // Hata olursa `.env` yarım kalmasın; bir sonraki build'de stale dosya görünmesin.
  if (existsSync(envPath)) unlinkSync(envPath);
  console.error(`✖ wrangler.toml ayrıştırılamadı: ${(error as Error).message}`);
  process.exit(1);
}
