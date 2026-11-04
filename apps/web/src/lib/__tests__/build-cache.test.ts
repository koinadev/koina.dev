import { mkdtempSync, rmSync, utimesSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { cacheStats, hashParts, openCache, pruneCache, resolveCacheDir, sourceVersion } from '../build-cache';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'build-cache-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('hashParts', () => {
  it('parça sınırlarını korur', () => {
    expect(hashParts('ab', 'c')).not.toBe(hashParts('a', 'bc'));
  });

  it('aynı girdi için aynı anahtarı üretir', () => {
    expect(hashParts('a', Buffer.from('b'))).toBe(hashParts('a', 'b'));
  });
});

describe('openCache', () => {
  it('yazılan kaydı geri verir, olmayanı MISS sayar', () => {
    const cache = openCache('t-roundtrip', dir);
    const key = hashParts('x');
    const before = cacheStats('t-roundtrip');
    expect(cache.get(key)).toBeNull();
    cache.put(key, 'merhaba');
    expect(cache.get(key)?.toString()).toBe('merhaba');
    const after = cacheStats('t-roundtrip');
    expect(after.miss - before.miss).toBe(1);
    expect(after.hit - before.hit).toBe(1);
  });

  it('yol geçişi içeren anahtarı reddeder', () => {
    expect(() => openCache('t-keys', dir).get('../../etc/passwd')).toThrow(/Geçersiz/);
  });

  it("yazılamayan dizinde build'i kırmaz", () => {
    const blocked = join(dir, 'dosya');
    writeFileSync(blocked, '');
    const cache = openCache('t-blocked', blocked); // dizin yerine dosya: mkdir başarısız olur
    expect(() => cache.put(hashParts('x'), 'y')).not.toThrow();
    expect(cache.get(hashParts('x'))).toBeNull();
  });
});

describe('pruneCache', () => {
  it('yalnızca build başlangıcından önce kullanılmayanları siler', () => {
    const cache = openCache('t-prune', dir);
    const stale = hashParts('eski');
    const used = hashParts('kullanilan');
    cache.put(stale, '1');
    cache.put(used, '2');
    const past = new Date(Date.now() - 60_000);
    utimesSync(join(dir, 't-prune', stale), past, past);
    utimesSync(join(dir, 't-prune', used), past, past);

    const since = Date.now() - 1000;
    cache.get(used); // bu build'de kullanıldı → mtime güncellenir

    expect(pruneCache(['t-prune'], since, dir)).toBe(1);
    expect(readdirSync(join(dir, 't-prune'))).toEqual([used]);
  });

  it('olmayan ad alanını görmezden gelir', () => {
    mkdirSync(join(dir, 'var'));
    expect(pruneCache(['yok', 'var'], Date.now(), dir)).toBe(0);
  });
});

describe('sourceVersion', () => {
  it('dosya içeriği değişince değişir', () => {
    writeFileSync(join(dir, 'a.ts'), 'bir');
    const first = sourceVersion(dir, 'a.ts');
    writeFileSync(join(dir, 'b.ts'), 'bir');
    expect(sourceVersion(dir, 'b.ts')).not.toBe(first); // yol da hash'e girer
  });
});

describe('resolveCacheDir', () => {
  it('proje kökünün altındaki node_modules/.astro dizinini verir', () => {
    expect(resolveCacheDir('/proje')).toBe('/proje/node_modules/.astro/nafru-build');
  });
});
