import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';

/** Bir özellik çıkarıldığında uygulanacak dosya/dizin taşıması. */
export interface MoveRule {
  /** Kaynak yol (proje köküne göre). Yoksa kural sessizce atlanır. */
  from: string;
  /** Hedef yol (proje köküne göre). Var olan bir DİZİNSE içerik birleştirilir. */
  to: string;
}

/**
 * Marker sökmenin ifade EDEMEDİĞİ tek dönüşüm: dosya taşıma (ör. i18n çıkarıldığında
 * `src/pages/tr/**` prefikssiz köke, `src/pages/`e taşınmalı).
 *
 * Kaynak yoksa kural sessizce atlanır. Kaynak DİZİN ve hedef VARSA girdiler tek tek hedefe
 * taşınır (birleştirme) ve kaynak silinir; aksi halde kaynak doğrudan hedefe yeniden adlandırılır.
 * Hedefte aynı adlı bir girdi varsa HATA fırlatır ve HİÇBİR ŞEY taşımaz — sessiz üzerine yazma
 * yok (ör. kök `index.astro` taşımadan önce silinmezse `tr/index.astro` onun üstüne yazardı).
 *
 * @returns GERÇEKTEN uygulanan taşımalar. Çağıran bunu log ve geri alma için kullanır: taşınan
 *          dosyalar hedefte İZLENMEYEN kopyalardır, `git reset --hard` onlara dokunamaz.
 */
export function applyMoves(moves: readonly MoveRule[], root = '.'): MoveRule[] {
  const applied: MoveRule[] = [];
  for (const { from, to } of moves) {
    const source = join(root, from);
    const destination = join(root, to);
    if (!existsSync(source)) continue;

    if (statSync(source).isDirectory() && existsSync(destination)) {
      const entries = readdirSync(source);
      // ÖNCE tüm çakışmaları kontrol et, SONRA taşı: yarım taşınmış bir ağaç bırakmayalım.
      for (const entry of entries) {
        if (existsSync(join(destination, entry))) {
          throw new Error(`Taşıma çakışması: ${posix.join(to, entry)} zaten var (kaynak: ${from})`);
        }
      }
      for (const entry of entries) {
        renameSync(join(source, entry), join(destination, entry));
        applied.push({ from: posix.join(from, entry), to: posix.join(to, entry) });
      }
      rmSync(source, { recursive: true, force: true });
    } else {
      if (existsSync(destination)) {
        throw new Error(`Taşıma çakışması: ${to} zaten var (kaynak: ${from})`);
      }
      mkdirSync(dirname(destination), { recursive: true });
      renameSync(source, destination);
      applied.push({ from, to });
    }
  }
  return applied;
}

/**
 * `applyMoves`'un TERSİ: uygulanmış taşımaları eski yerlerine geri taşır (silmek yerine —
 * silmek, kirli ağaçta `--force` ile çalışan kullanıcının o dosyadaki commit edilmemiş
 * değişikliklerini de yok ederdi). Ters sırada ilerler; birleşmeyle boşalan kaynak dizin
 * gerekirse yeniden oluşturulur.
 */
export function revertMoves(applied: readonly MoveRule[], root = '.'): void {
  for (let i = applied.length - 1; i >= 0; i--) {
    const { from, to } = applied[i];
    const source = join(root, from);
    const destination = join(root, to);
    if (!existsSync(destination)) continue;
    if (existsSync(source)) {
      // Beklenmedik durum: kaynak yeniden oluşmuş. Üzerine YAZMA — hangi tarafın kullanıcının
      // işi olduğunu bilemeyiz. Gürültülü bırak ki elle çözülsün.
      console.error(`✖ Geri taşınamadı, ${from} yeniden oluşmuş. ${to} elle kontrol edilmeli.`);
      continue;
    }
    mkdirSync(dirname(source), { recursive: true });
    renameSync(destination, source);
  }
}
