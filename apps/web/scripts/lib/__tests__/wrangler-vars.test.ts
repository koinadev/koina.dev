import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readWranglerVars } from '../wrangler-vars';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'wrangler-vars-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function write(content: string): string {
  const path = join(dir, 'wrangler.toml');
  writeFileSync(path, content);
  return path;
}

describe('readWranglerVars', () => {
  it('yalnızca [vars] değerlerini okur; yorumları ve tırnak içi # / URL değerlerini bozmaz', () => {
    const path = write(
      [
        'name = "x"',
        '[assets]',
        'directory = "./dist"',
        '[vars]',
        '# yorum',
        'PUBLIC_A = "https://a.example/yol#parca" # satır sonu yorumu',
        'PUBLIC_B = ""',
      ].join('\n'),
    );
    expect(readWranglerVars(path)).toEqual({ PUBLIC_A: 'https://a.example/yol#parca', PUBLIC_B: '' });
  });

  it('[vars] yoksa, dosya yoksa ve değer metin değilse hata verir', () => {
    expect(() => readWranglerVars(write('name = "x"'))).toThrow('[vars]');
    expect(() => readWranglerVars(join(dir, 'yok.toml'))).toThrow('bulunamadı');
    expect(() => readWranglerVars(write('[vars]\nPUBLIC_N = 1'))).toThrow('PUBLIC_N');
  });

  it("deponun gerçek wrangler.toml'unu ayrıştırır", () => {
    const vars = readWranglerVars(resolve(import.meta.dirname, '../../../wrangler.toml'));
    expect(vars.PUBLIC_SITE_URL).toBe('https://koina.dev');
    expect(vars.PUBLIC_BLOG_REMOTE_ENDPOINT).toBe('');
  });
});
