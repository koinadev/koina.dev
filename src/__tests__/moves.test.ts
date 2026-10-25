import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyMoves, revertMoves } from '../../scripts/lib/moves';

let root: string;

function write(relative: string, content: string): void {
  const target = join(root, relative);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'moves-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('applyMoves', () => {
  it('dizin içeriğini var olan hedefe BİRLEŞTİRİR ve kaynağı siler', () => {
    write('src/pages/tr/index.astro', 'tr ana sayfa');
    write('src/pages/tr/blog/index.astro', 'tr blog');
    write('src/pages/404.astro', '404');

    applyMoves([{ from: 'src/pages/tr', to: 'src/pages' }], root);

    expect(readFileSync(join(root, 'src/pages/index.astro'), 'utf8')).toBe('tr ana sayfa');
    expect(readFileSync(join(root, 'src/pages/blog/index.astro'), 'utf8')).toBe('tr blog');
    // Hedefte zaten duran dosyalara dokunulmaz.
    expect(existsSync(join(root, 'src/pages/404.astro'))).toBe(true);
    expect(existsSync(join(root, 'src/pages/tr'))).toBe(false);
  });

  it('kaynak yoksa sessizce atlar (özellik zaten çıkarılmış olabilir)', () => {
    write('src/pages/404.astro', '404');
    expect(() => applyMoves([{ from: 'src/pages/tr', to: 'src/pages' }], root)).not.toThrow();
    expect(existsSync(join(root, 'src/pages/404.astro'))).toBe(true);
  });

  it('hedef yoksa dizini olduğu gibi yeniden adlandırır', () => {
    write('src/pages/tr/index.astro', 'tr');
    applyMoves([{ from: 'src/pages/tr', to: 'src/sayfalar' }], root);
    expect(readFileSync(join(root, 'src/sayfalar/index.astro'), 'utf8')).toBe('tr');
    expect(existsSync(join(root, 'src/pages/tr'))).toBe(false);
  });

  // ÇAKIŞMA SESSİZ GEÇİLMEZ: kök `index.astro` (dil yönlendirme stub'ı) taşımadan ÖNCE
  // silinmezse `tr/index.astro` onun üstüne yazardı. Sıra hatası hemen görünmeli.
  it('hedefte aynı adlı dosya varsa HATA fırlatır', () => {
    write('src/pages/index.astro', 'kök stub');
    write('src/pages/tr/index.astro', 'tr ana sayfa');
    expect(() => applyMoves([{ from: 'src/pages/tr', to: 'src/pages' }], root)).toThrow(/index\.astro/);
    // Hata öncesi hiçbir şey bozulmamalı: kaynak yerinde durur.
    expect(readFileSync(join(root, 'src/pages/index.astro'), 'utf8')).toBe('kök stub');
    expect(readFileSync(join(root, 'src/pages/tr/index.astro'), 'utf8')).toBe('tr ana sayfa');
  });

  // Rapor SADECE log için değil: çağıran GERİ ALMADA bu hedefleri silmek zorunda — taşıma
  // izlenmeyen kopyalar üretir ve `git reset --hard` izlenmeyen dosyalara dokunmaz.
  it('uygulanan taşımaları girdi bazında raporlar', () => {
    write('src/pages/tr/index.astro', 'tr');
    write('src/pages/tr/blog/index.astro', 'tr blog');
    expect(applyMoves([{ from: 'src/pages/tr', to: 'src/pages' }], root)).toEqual([
      { from: 'src/pages/tr/blog', to: 'src/pages/blog' },
      { from: 'src/pages/tr/index.astro', to: 'src/pages/index.astro' },
    ]);
  });
});

describe('revertMoves', () => {
  it('dosyayı eski yerine geri taşır ve hedefi bırakmaz', () => {
    write('src/pages/tr/index.astro', 'TR ANA SAYFA');
    const applied = applyMoves([{ from: 'src/pages/tr', to: 'src/pages' }], root);
    expect(existsSync(join(root, 'src/pages/index.astro'))).toBe(true);

    revertMoves(applied, root);

    expect(existsSync(join(root, 'src/pages/index.astro'))).toBe(false);
    expect(readFileSync(join(root, 'src/pages/tr/index.astro'), 'utf8')).toBe('TR ANA SAYFA');
  });

  it('kullanıcının taşınmış dosyadaki commit edilmemiş değişikliğini KORUR', () => {
    // Bu testin varlık sebebi: geri alma önce hedefi SİLİYORDU, bu da --force ile kirli ağaçta
    // çalışan kullanıcının işini yok ediyordu. Silmek yerine geri taşımak bunu çözer.
    write('src/pages/tr/gizlilik.astro', 'ORİJİNAL');
    const applied = applyMoves([{ from: 'src/pages/tr', to: 'src/pages' }], root);
    writeFileSync(join(root, 'src/pages/gizlilik.astro'), 'KULLANICININ DÜZENLEMESİ');

    revertMoves(applied, root);

    expect(readFileSync(join(root, 'src/pages/tr/gizlilik.astro'), 'utf8')).toBe('KULLANICININ DÜZENLEMESİ');
  });

  it('birleştirmeli taşımada her girdiyi tek tek geri alır', () => {
    write('src/pages/tr/a.astro', 'A');
    write('src/pages/tr/blog/b.astro', 'B');
    write('src/pages/404.astro', 'NOT FOUND');
    const applied = applyMoves([{ from: 'src/pages/tr', to: 'src/pages' }], root);

    revertMoves(applied, root);

    expect(readFileSync(join(root, 'src/pages/tr/a.astro'), 'utf8')).toBe('A');
    expect(readFileSync(join(root, 'src/pages/tr/blog/b.astro'), 'utf8')).toBe('B');
    // Taşımaya hiç karışmayan dosya yerinde kalmalı.
    expect(readFileSync(join(root, 'src/pages/404.astro'), 'utf8')).toBe('NOT FOUND');
    expect(existsSync(join(root, 'src/pages/a.astro'))).toBe(false);
  });

  it('kaynak yeniden oluşmuşsa ÜZERİNE YAZMAZ ve durumu BİLDİRİR', () => {
    // `console.error` KASTEN yakalanıyor. İki sebebi var ve ikisi de kozmetik değil:
    //  1. Uyarının GERÇEKTEN basıldığı burada kilitleniyordu — eskiden yalnızca dosyanın
    //     korunduğu doğrulanıyordu, yani `revertMoves` sessizleşse test yine yeşil kalırdı.
    //     Oysa sözleşmenin yarısı "elle çözülmesi için GÜRÜLTÜLÜ bırak" (bkz. moves.ts).
    //  2. Yakalanmadığında satır ham hâlde CI günlüğüne düşüyor ve orada bir ÇALIŞTIRMA
    //     HATASI gibi okunuyordu: `✖` işaretli Türkçe bir arıza mesajı, yeşil bir vitest
    //     adımının ortasında. Şablondan türeyen kardeş depolarda da aynı yanılgıya yol açtı.
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      write('src/pages/tr/index.astro', 'ORİJİNAL');
      const applied = applyMoves([{ from: 'src/pages/tr', to: 'src/pages' }], root);
      write('src/pages/tr/index.astro', 'SONRADAN OLUŞAN');

      revertMoves(applied, root);

      expect(readFileSync(join(root, 'src/pages/tr/index.astro'), 'utf8')).toBe('SONRADAN OLUŞAN');
      expect(errors).toHaveBeenCalledTimes(1);
      // Mesaj İKİ yolu da anmalı: kullanıcı hangi dosyayı hangisiyle karşılaştıracağını bilmeli.
      expect(errors.mock.calls[0][0]).toContain('src/pages/tr/index.astro');
      expect(errors.mock.calls[0][0]).toContain('src/pages/index.astro');
    } finally {
      errors.mockRestore();
    }
  });
});
