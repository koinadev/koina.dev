/**
 * Build hook'u için KONTROLLÜ build: `bun run build:incremental`.
 *
 * Hook sürekli tetiklenir (her yeni/değişen blog yazısında, bazen üst üste). Bu betik:
 *   1. Aynı anda tek build koşar; sonrakiler sırada bekler ve kendi sırası geldiğinde yeniden
 *      karar verir — arka arkaya gelen 5 tetik, ilk build bittiğinde "değişen yok" ile atlanır.
 *   2. Girdilerin parmak izini önceki BAŞARILI build ile karşılaştırır, yeni/değişen/silinen
 *      yazıları listeler. Hiçbir şey değişmediyse ve `dist/` yerindeyse build'i atlar.
 *   3. Build koşarsa pahalı adımlar (OG PNG, `.md` ikizi) yalnızca yeni/değişen yazılar için
 *      yeniden üretilir; gerisi `src/lib/build-cache.ts` önbelleğinden gelir.
 *
 * Kayıt build BAŞARILI bitince yazılır: düşen build bir sonraki tetikte yeniden denenir.
 * Parmak izi build'den ÖNCE alınır: build sırasında gelen yazı sonraki turda yakalanır.
 *
 * Bayraklar: `--dry-run` yalnızca planı yazar, `--force` her koşulda build eder,
 * `--clear-cache` önbelleği ve kaydı silip sıfırdan başlar, `--no-dist-check` `dist/`in
 * kalıcı OLMADIĞI ortamlarda (GitHub Actions) atlamayı `dist/` varlığına bağlamaz.
 *
 * GitHub Actions'ta çalışırken `GITHUB_OUTPUT`a `built=true|false` yazar: deploy adımı yalnızca
 * build koştuysa çalışmalı, atlandıysa yayında zaten aynı çıktı var.
 */

import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { resolveCacheDir } from '../src/lib/build-cache';
import {
  decide,
  formatPlan,
  readDistMarker,
  scanInputs,
  type BuildState,
  type Decision,
} from './lib/build-plan';
import { acquireLock } from './lib/build-lock';
import { readWranglerVars } from './lib/wrangler-vars';

const root = resolve(import.meta.dirname, '..');
const cacheDir = resolveCacheDir(root);
const statePath = join(cacheDir, 'state.json');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const force = args.has('--force');
const clearCache = args.has('--clear-cache');
const checkDist = !args.has('--no-dist-check');

/** GitHub Actions dışında (ya da `--dry-run`da) hiçbir şey yapmaz. */
function reportToActions(decision: Decision, built: boolean): void {
  if (dryRun) return;
  const { GITHUB_OUTPUT, GITHUB_STEP_SUMMARY } = process.env;
  if (GITHUB_OUTPUT) appendFileSync(GITHUB_OUTPUT, `built=${built}\n`);
  if (GITHUB_STEP_SUMMARY) {
    const outcome = built ? 'build edildi' : 'build atlandı';
    appendFileSync(GITHUB_STEP_SUMMARY, `### ${outcome}\n\n\`\`\`\n${formatPlan(decision)}\n\`\`\`\n`);
  }
}

function readState(): BuildState | null {
  try {
    const state = JSON.parse(readFileSync(statePath, 'utf8')) as BuildState;
    return state.version === 1 ? state : null;
  } catch {
    return null; // yok ya da bozuk: ilk build gibi davran
  }
}

function hasRemoteSource(): boolean {
  try {
    return (readWranglerVars(join(root, 'wrangler.toml')).PUBLIC_BLOG_REMOTE_ENDPOINT ?? '').trim() !== '';
  } catch {
    return true; // okunamıyorsa güvenli taraf: atlama
  }
}

async function main(): Promise<number> {
  if (clearCache) {
    rmSync(cacheDir, { recursive: true, force: true });
    console.log(`✓ önbellek temizlendi: ${cacheDir}`);
  }
  mkdirSync(cacheDir, { recursive: true });

  // Plan kilit ALTINDA yapılır: beklerken başka build'in yazdığı kayıt kararı etkilemeli.
  const release = dryRun ? () => {} : await acquireLock(join(cacheDir, 'build.lock'));
  try {
    const scan = scanInputs(root);
    const decision = decide({
      scan,
      previous: readState(),
      dist: readDistMarker(root),
      remote: hasRemoteSource(),
      force,
      checkDist,
    });
    console.log(formatPlan(decision));

    if (dryRun) return 0;
    if (!decision.build) {
      reportToActions(decision, false);
      return 0;
    }

    const started = Date.now();
    const result = spawnSync('bun', ['run', 'build'], { cwd: root, stdio: 'inherit' });
    if (result.status !== 0) {
      console.error('✖ build başarısız; kayıt güncellenmedi, sonraki tetikte yeniden denenecek.');
      return result.status ?? 1;
    }

    const state: BuildState = {
      version: 1,
      siteHash: scan.siteHash,
      posts: scan.posts,
      dist: readDistMarker(root),
      builtAt: new Date().toISOString(),
    };
    writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
    reportToActions(decision, true);
    console.log(`✓ build tamam (${((Date.now() - started) / 1000).toFixed(1)} sn), kayıt güncellendi.`);
    return 0;
  } finally {
    release();
  }
}

process.exit(await main());
