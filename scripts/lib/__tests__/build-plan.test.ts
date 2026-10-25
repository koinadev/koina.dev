import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { acquireLock } from '../build-lock';
import { decide, diffPosts, postIdFor, scanInputs, type BuildState, type InputScan } from '../build-plan';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'build-plan-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function write(path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

describe('postIdFor', () => {
  it('sayfa demeti ve düz dosyayı aynı kimliğe çevirir', () => {
    expect(postIdFor('content/blog/tr/merhaba/index.md')).toBe('tr/merhaba');
    expect(postIdFor('content/blog/tr/merhaba/cover.jpg')).toBe('tr/merhaba');
    expect(postIdFor('content/blog/tr/merhaba.md')).toBe('tr/merhaba');
  });

  it('blog dışındaki ve dile ait olmayan dosyayı yazı saymaz', () => {
    expect(postIdFor('content/pages/a.md')).toBeNull();
    expect(postIdFor('content/blog/README.md')).toBeNull();
    expect(postIdFor('src/pages/index.astro')).toBeNull();
  });
});

describe('scanInputs', () => {
  it('yalnızca değişen yazının özetini değiştirir', () => {
    write('content/blog/tr/a/index.md', 'A');
    write('content/blog/tr/b/index.md', 'B');
    write('src/x.ts', 'kod');
    const first = scanInputs(root);

    write('content/blog/tr/b/index.md', 'B2');
    const second = scanInputs(root);

    expect(second.posts['tr/a']).toBe(first.posts['tr/a']);
    expect(second.posts['tr/b']).not.toBe(first.posts['tr/b']);
    expect(second.siteHash).toBe(first.siteHash);
  });

  it('yazının görseli değişince yazı değişmiş sayılır', () => {
    write('content/blog/tr/a/index.md', 'A');
    write('content/blog/tr/a/cover.jpg', '1');
    const first = scanInputs(root);
    write('content/blog/tr/a/cover.jpg', '2');
    expect(scanInputs(root).posts['tr/a']).not.toBe(first.posts['tr/a']);
  });

  it('kod değişince siteHash değişir, test dosyaları ve docs etkilemez', () => {
    write('src/x.ts', 'bir');
    const first = scanInputs(root);

    write('src/__tests__/x.test.ts', 'test');
    write('docs/a.md', 'doc');
    expect(scanInputs(root).siteHash).toBe(first.siteHash);

    write('src/x.ts', 'iki');
    expect(scanInputs(root).siteHash).not.toBe(first.siteHash);
  });
});

describe('diffPosts', () => {
  it('yeni, değişen, silinen ve değişmeyeni ayırır', () => {
    expect(diffPosts({ a: '1', b: '1', c: '1' }, { a: '1', b: '2', d: '1' })).toEqual({
      added: ['d'],
      changed: ['b'],
      removed: ['c'],
      unchanged: 1,
    });
  });
});

describe('decide', () => {
  const scan: InputScan = { siteHash: 's', posts: { 'tr/a': '1' } };
  const dist = { mtimeMs: 10, size: 5 };
  const previous: BuildState = {
    version: 1,
    siteHash: 's',
    posts: { 'tr/a': '1' },
    dist,
    builtAt: '',
  };
  const base = { scan, previous, dist, remote: false, force: false };

  it('hiçbir şey değişmediyse atlar', () => {
    expect(decide(base).build).toBe(false);
  });

  it('yeni yazıda build eder', () => {
    const next = { ...base, scan: { ...scan, posts: { ...scan.posts, 'tr/b': '1' } } };
    const decision = decide(next);
    expect(decision.build).toBe(true);
    expect(decision.diff.added).toEqual(['tr/b']);
  });

  it('kod değişince, kayıt yoksa, dist kaybolunca, uzak kaynakta ve --force ile build eder', () => {
    expect(decide({ ...base, scan: { ...scan, siteHash: 'x' } }).build).toBe(true);
    expect(decide({ ...base, previous: null }).build).toBe(true);
    expect(decide({ ...base, dist: null }).build).toBe(true);
    expect(decide({ ...base, dist: { mtimeMs: 11, size: 5 } }).build).toBe(true);
    expect(decide({ ...base, remote: true }).build).toBe(true);
    expect(decide({ ...base, force: true }).build).toBe(true);
  });

  it('checkDist: false iken dist yokluğu build gerektirmez, ama girdi değişimi gerektirir', () => {
    const ci = { ...base, dist: null, checkDist: false };
    expect(decide(ci).build).toBe(false);
    expect(decide({ ...ci, scan: { ...scan, posts: { 'tr/a': '2' } } }).build).toBe(true);
    expect(decide({ ...ci, previous: null }).build).toBe(true);
  });
});

describe('acquireLock', () => {
  it('ikinci alıcı birincinin bırakmasını bekler', async () => {
    const lock = join(root, 'lock');
    const release = await acquireLock(lock);
    let second = false;
    const waiting = acquireLock(lock).then((r) => {
      second = true;
      return r;
    });
    await new Promise((done) => setTimeout(done, 300));
    expect(second).toBe(false);
    release();
    (await waiting)();
    expect(second).toBe(true);
  });

  it('ölü sahibin kilidini devralır', async () => {
    const lock = join(root, 'lock');
    mkdirSync(lock);
    writeFileSync(join(lock, 'pid'), '2147483646'); // olmayan pid
    (await acquireLock(lock, 5000))();
  });
});
