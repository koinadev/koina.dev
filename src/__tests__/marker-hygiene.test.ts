import { readFileSync } from 'node:fs';
import { globSync } from 'tinyglobby';
import { describe, expect, it } from 'vitest';
import { features } from '../../features.manifest';
import { SWEEP_GLOBS, SWEEP_IGNORE } from '../../scripts/lib/markers';

// Marker metnini bir AÇIKLAMA CÜMLESİ içinde yazmak, süpürmenin o satırı gerçek marker sanıp
// SİLMESİNE yol açar — yorum ortadan ikiye bölünür ve kimse fark etmez. Bu gerçekten oldu:
// `src/i18n/routes.ts`te marker biçimini anlatan yorum satırı i18n çıkarılınca yok oldu.
// Bu test, süpürülen her dosyada marker metninin YALNIZCA gerçek marker konumlarında
// (tek başına duran blok satırı ya da bir kod satırının SONU) geçtiğini doğrular.
//
// Bu dosya markerları kaçış dizilerinden KURDUĞU için kendisi süpürmeye takılmaz.
const MARKER_FORMS = (name: string) => [
  `/\\* @/?feature:${name} \\*/`,
  `<!-- @/?feature:${name} -->`,
  `// @/?feature:${name}(?![\\w-])`,
];

describe('marker hijyeni', () => {
  it('marker metni yalnızca gerçek marker konumlarında geçer', () => {
    const files = globSync(SWEEP_GLOBS, { ignore: SWEEP_IGNORE });
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const name of Object.keys(features)) {
      const forms = MARKER_FORMS(name).join('|');
      const anywhere = new RegExp(`(${forms})`);
      const aloneOnLine = new RegExp(`^\\s*(${forms})\\s*$`);
      const atLineEnd = new RegExp(`(${forms})\\s*$`);
      for (const file of files) {
        readFileSync(file, 'utf8')
          .split('\n')
          .forEach((line, index) => {
            if (!anywhere.test(line)) return;
            if (aloneOnLine.test(line) || atLineEnd.test(line)) return;
            offenders.push(`${file}:${index + 1} [${name}] ${line.trim()}`);
          });
      }
    }
    expect(offenders).toEqual([]);
  });
});
