import { createHash } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Build önbelleği: pahalı, SAF üretim adımlarının (OG PNG, `.md` ikizi) çıktısını girdisinin
 * hash'iyle saklar. Build hook'u sürekli tetiklendiğinde değişmeyen yazı yeniden işlenmez.
 *
 * NEDEN İÇERİK ADRESLİ: anahtar girdinin kendisinden türer, bir "değişti mi" listesi tutulmaz.
 * Böylece yeni yazı otomatik MISS, değişen yazı otomatik MISS, dokunulmayan yazı otomatik HIT
 * olur; liste ile gerçek arasında ayrışma ihtimali yoktur.
 *
 * NEDEN `node_modules/.astro/`: Astro'nun kendi önbellek dizini (`cacheDir`). Barındırıcıların
 * "framework önbelleği" tam olarak bu yolu saklar: Cloudflare Workers Builds yalnızca paket
 * yöneticisi önbelleğini ve `node_modules/.astro`yu, Vercel `node_modules/**`ı geri yükler. Başka
 * bir yol (ör. `node_modules/.cache`) Cloudflare'de build'ler arasında kaybolur; bu yüzden dizin
 * sabittir, ortam değişkeniyle değiştirilmez. Önbellek HİÇBİR ZAMAN build'i kıramaz: okuma/yazma
 * hatası MISS sayılır, `dist/` içine hiçbir şey yazılmaz (aksi halde önbellek yayına çıkardı).
 */

export const CACHE_DIR = 'node_modules/.astro/nafru-build';

const KEY_PATTERN = /^[0-9a-f]{64}$/;
const STATS_SYMBOL = Symbol.for('nafru.build-cache.stats');

export interface CacheCounters {
  hit: number;
  miss: number;
}

export function resolveCacheDir(root = process.cwd()): string {
  return resolve(root, CACHE_DIR);
}

/**
 * Parçaları belirsizliksiz birleştirip SHA-256 üretir. Her parçanın uzunluğu hash'e girer:
 * `('ab', 'c')` ile `('a', 'bc')` aynı anahtarı vermesin.
 */
export function hashParts(...parts: Array<string | Uint8Array>): string {
  const hash = createHash('sha256');
  for (const part of parts) {
    const bytes = typeof part === 'string' ? Buffer.from(part, 'utf8') : part;
    hash.update(`${bytes.byteLength}:`);
    hash.update(bytes);
  }
  return hash.digest('hex');
}

const sourceHashes = new Map<string, string>();

/**
 * Üretici kodun sürüm damgası: dosyaların içeriğinin hash'i. OG şablonu ya da markdown
 * ayıklayıcı değiştiğinde eski çıktıların servis edilmemesi için anahtara girer — elle bump
 * edilen bir sürüm sabiti unutulur, içerik hash'i unutulamaz.
 */
export function sourceVersion(root: string, ...relativePaths: string[]): string {
  const cacheKey = `${root}\0${relativePaths.join('\0')}`;
  const known = sourceHashes.get(cacheKey);
  if (known) return known;
  const version = hashParts(...relativePaths.flatMap((path) => [path, readFileSync(resolve(root, path))]));
  sourceHashes.set(cacheKey, version);
  return version;
}

function counters(namespace: string): CacheCounters {
  // `globalThis`: Astro, rotaları ayrı bir bundle'dan yüklüyor; modül durumu entegrasyonla
  // paylaşılmaz, süreç durumu paylaşılır.
  const all = ((globalThis as Record<symbol, unknown>)[STATS_SYMBOL] ??= {}) as Record<string, CacheCounters>;
  return (all[namespace] ??= { hit: 0, miss: 0 });
}

export function cacheStats(namespace: string): CacheCounters {
  return { ...counters(namespace) };
}

export interface BuildCache {
  /** Girdi hash'ine karşılık gelen kayıt; yoksa ya da okunamıyorsa `null` (MISS). */
  get(key: string): Buffer | null;
  /** Kaydı atomik yazar; başarısız olursa sessizce vazgeçer (önbellek build'i kıramaz). */
  put(key: string, data: string | Uint8Array): void;
}

export function openCache(namespace: string, dir = resolveCacheDir()): BuildCache {
  const base = join(dir, namespace);
  const pathFor = (key: string) => {
    if (!KEY_PATTERN.test(key)) throw new Error(`Geçersiz önbellek anahtarı: ${key}`);
    return join(base, key);
  };

  return {
    get(key) {
      const path = pathFor(key);
      try {
        const data = readFileSync(path);
        // Dokunma: HIT olan kayıt "bu build'de kullanıldı" damgasını alır; `pruneCache`
        // kullanılmayanları (silinmiş/değişmiş yazıların artıkları) bu damgadan ayırır.
        const now = new Date();
        utimesSync(path, now, now);
        counters(namespace).hit += 1;
        return data;
      } catch {
        counters(namespace).miss += 1;
        return null;
      }
    },
    put(key, data) {
      const path = pathFor(key);
      const temporary = `${path}.${process.pid}.tmp`;
      try {
        mkdirSync(base, { recursive: true });
        // Yaz + yeniden adlandır: eşzamanlı iki build yarım dosya okumasın.
        writeFileSync(temporary, data);
        renameSync(temporary, path);
      } catch {
        try {
          rmSync(temporary, { force: true });
        } catch {
          // Temizlik de başarısızsa (ör. yazılamayan dizin) yapılacak bir şey yok.
        }
      }
    },
  };
}

/**
 * `since`ten (build başlangıcı) önce kullanılmamış kayıtları siler. Yalnızca BAŞARILI bir
 * build'in sonunda çağrılmalı: düşen build'de hiçbir kayıt kullanılmamış olabilir ve bu
 * çağrı tüm önbelleği boşaltırdı.
 */
export function pruneCache(namespaces: string[], since: number, dir = resolveCacheDir()): number {
  let removed = 0;
  for (const namespace of namespaces) {
    const base = join(dir, namespace);
    let entries: string[];
    try {
      entries = readdirSync(base);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const path = join(base, entry);
      try {
        if (statSync(path).mtimeMs < since) {
          rmSync(path, { force: true });
          removed += 1;
        }
      } catch {
        // Başka bir süreç aynı anda silmiş olabilir; önemsiz.
      }
    }
  }
  return removed;
}
