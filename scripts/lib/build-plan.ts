import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Artımlı build'in karar mantığı: girdileri parmak izine çevirir, önceki build'in kaydıyla
 * karşılaştırır ve "ne değişti, build gerekli mi" sorusunu yanıtlar. Yan etkisiz parçalar
 * (`diffPosts`, `decide`) ayrı tutuldu ki dosya sistemi olmadan sınanabilsin.
 */

/** Yazı kaynağı: `content/blog/<dil>/<slug>/…` (sayfa demeti) ya da `content/blog/<dil>/<slug>.md`. */
const BLOG_ROOT = 'content/blog';

/**
 * Site çıktısını etkileyen girdiler. `docs/`, `scripts/` ve testler bilerek YOK: bunlardan biri
 * değiştiğinde yayınlanan site değişmez, build tetiklemek boşa harcanan dakikadır.
 */
const SITE_INPUTS = [
  'src',
  'public',
  'content',
  'astro.config.mjs',
  'wrangler.toml',
  'package.json',
  'bun.lock',
  'tsconfig.json',
];

const IGNORED_SEGMENTS = new Set(['__tests__', '.DS_Store']);

export interface InputScan {
  /** Yazı dışındaki her şeyin (kod, public, yapılandırma, bağımlılıklar) tek özeti. */
  siteHash: string;
  /** `<dil>/<slug>` → o yazının tüm dosyalarının özeti. */
  posts: Record<string, string>;
}

export interface DistMarker {
  mtimeMs: number;
  size: number;
}

export interface BuildState {
  version: 1;
  siteHash: string;
  posts: Record<string, string>;
  dist: DistMarker | null;
  builtAt: string;
}

export interface PostDiff {
  added: string[];
  changed: string[];
  removed: string[];
  unchanged: number;
}

export type Decision =
  { build: true; reason: string; diff: PostDiff } | { build: false; reason: string; diff: PostDiff };

function sha1(...parts: Array<string | Buffer>): string {
  const hash = createHash('sha1');
  for (const part of parts) hash.update(part).update('\0');
  return hash.digest('hex');
}

/** Bir dizindeki tüm dosyaları (göreli yol, sıralı) verir; yoksa boş. */
function listFiles(root: string, relativeDir: string): string[] {
  const base = join(root, relativeDir);
  if (!existsSync(base)) return [];
  const stat = statSync(base);
  if (stat.isFile()) return [relativeDir];
  return readdirSync(base, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, join(entry.parentPath, entry.name)))
    .filter((path) => !path.split(sep).some((segment) => IGNORED_SEGMENTS.has(segment)))
    .sort();
}

/** `content/blog/tr/merhaba/index.md` → `tr/merhaba`; `…/tr/merhaba.md` → `tr/merhaba`. */
export function postIdFor(relativePath: string): string | null {
  const segments = relativePath.split(/[\\/]/);
  const blog = BLOG_ROOT.split('/');
  if (blog.some((segment, index) => segments[index] !== segment)) return null;
  const rest = segments.slice(blog.length);
  // `content/blog/README.md` gibi dile ait olmayan tekil dosya bir yazı değildir.
  if (rest.length < 2) return null;
  const slug = rest.length === 2 ? rest[1].replace(/\.[^.]+$/, '') : rest[1];
  return `${rest[0]}/${slug}`;
}

export function scanInputs(root: string): InputScan {
  const siteParts: string[] = [];
  const postParts = new Map<string, string[]>();

  for (const input of SITE_INPUTS) {
    for (const file of listFiles(root, input)) {
      const digest = sha1(file, readFileSync(join(root, file)));
      const postId = postIdFor(file);
      if (postId) {
        const list = postParts.get(postId) ?? [];
        list.push(digest);
        postParts.set(postId, list);
      } else {
        siteParts.push(digest);
      }
    }
  }

  const posts: Record<string, string> = {};
  for (const [id, digests] of [...postParts].sort(([a], [b]) => a.localeCompare(b))) {
    posts[id] = sha1(...digests);
  }
  return { siteHash: sha1(...siteParts), posts };
}

export function diffPosts(previous: Record<string, string>, next: Record<string, string>): PostDiff {
  const added = Object.keys(next).filter((id) => !(id in previous));
  const removed = Object.keys(previous).filter((id) => !(id in next));
  const changed = Object.keys(next).filter((id) => id in previous && previous[id] !== next[id]);
  const unchanged = Object.keys(next).length - added.length - changed.length;
  return { added: added.sort(), changed: changed.sort(), removed: removed.sort(), unchanged };
}

export interface DecideInput {
  scan: InputScan;
  previous: BuildState | null;
  dist: DistMarker | null;
  /** Uzak blog kaynağı tanımlı mı? Diskte görünmeyen yazılar olduğundan değişiklik denetlenemez. */
  remote: boolean;
  force: boolean;
  /**
   * `dist/` build'ler arasında kalıcı mı? GitHub Actions gibi her koşuda sıfırdan başlayan
   * ortamlarda değil: orada kayıt "en son YAYINLANAN çıktı"yı temsil eder ve `dist/`in
   * yokluğu build gerektirmez. Varsayılan `true` (yerel/sunucu: dist olmadan atlama güvensiz).
   */
  checkDist?: boolean;
}

export function decide({ scan, previous, dist, remote, force, checkDist = true }: DecideInput): Decision {
  const diff = diffPosts(previous?.posts ?? {}, scan.posts);
  const hasPostChanges = diff.added.length + diff.changed.length + diff.removed.length > 0;

  if (force) return { build: true, reason: '--force verildi', diff };
  if (!previous) return { build: true, reason: 'önceki build kaydı yok (ilk build)', diff };
  if (remote) {
    return {
      build: true,
      reason: 'uzak blog kaynağı tanımlı; yeni yazılar diskte görünmediği için denetlenemez',
      diff,
    };
  }
  if (previous.siteHash !== scan.siteHash) {
    return { build: true, reason: 'site kodu, public/ ya da yapılandırma değişti', diff };
  }
  if (hasPostChanges) {
    return {
      build: true,
      reason: `yazılar değişti (+${diff.added.length} ~${diff.changed.length} -${diff.removed.length})`,
      diff,
    };
  }
  if (
    checkDist &&
    (!dist || !previous.dist || dist.mtimeMs !== previous.dist.mtimeMs || dist.size !== previous.dist.size)
  ) {
    return { build: true, reason: "dist/ yok ya da son build'den sonra değişmiş", diff };
  }
  return { build: false, reason: 'girdiler son başarılı build ile aynı', diff };
}

/** `dist/index.html`in imzası: dist silinirse ya da başka bir build ezerse atlama kararı bozulur. */
export function readDistMarker(root: string): DistMarker | null {
  const path = join(root, 'dist', 'index.html');
  if (!existsSync(path)) return null;
  const { mtimeMs, size } = statSync(path);
  return { mtimeMs, size };
}

export function formatPlan(decision: Decision): string {
  const { diff } = decision;
  const lines = [`${decision.build ? '▶ build gerekli' : '✓ build atlanır'}: ${decision.reason}`];
  for (const id of diff.added) lines.push(`  + yeni      ${id}`);
  for (const id of diff.changed) lines.push(`  ~ değişti   ${id}`);
  for (const id of diff.removed) lines.push(`  - silindi   ${id}`);
  if (diff.unchanged > 0) lines.push(`  = ${diff.unchanged} yazı değişmedi (önbellekten gelir)`);
  return lines.join('\n');
}
