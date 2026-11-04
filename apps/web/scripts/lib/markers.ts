function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// `// @feature:team` biçimi kendinden sonra kapatıcı bir simge taşımaz; bu yüzden ad sınırını
// açıkça korumak gerekir. Aksi halde `team` sökülürken `// @feature:teams` satırı da eşleşir
// (bkz. scripts/lib/__tests__/markers.test.ts "ön ek çakışması"). Blok/HTML biçimleri
// ` */` ve ` -->` ile zaten kapandığı için tek başına ad sınırı sağlar, yine de tutarlılık
// adına aynı yapı kullanılır.
const NAME_BOUNDARY = '(?![\\w-])';

function markerAlternatives(name: string, closing: boolean): string {
  const at = closing ? `@\\/feature:${name}` : `@feature:${name}`;
  return [`\\/\\* ${at} \\*\\/`, `<!-- ${at} -->`, `\\/\\/ ${at}${NAME_BOUNDARY}`].join('|');
}

/**
 * Bir özelliğe ait marker'ları içerikten söker.
 *
 * İki biçim desteklenir:
 * - Blok: açılış ve kapanış marker'ı satırın TEK içeriğidir; arasındaki her şey silinir.
 * - Satır: marker bir kod satırının sonuna eklenir; yalnızca o satır silinir.
 *
 * Aynı özelliğin iç içe blokları derinlik sayımıyla desteklenir. Dengesiz marker'da `Error`
 * fırlatır — sessizce bozuk çıktı üretmez.
 */
export function stripFeature(content: string, feature: string): string {
  const f = escapeRe(feature);
  const startRe = new RegExp(`^\\s*(${markerAlternatives(f, false)})\\s*$`);
  const endRe = new RegExp(`^\\s*(${markerAlternatives(f, true)})\\s*$`);
  const inlineRe = new RegExp(markerAlternatives(f, false));

  const out: string[] = [];
  let depth = 0;
  for (const line of content.split('\n')) {
    if (startRe.test(line)) {
      depth += 1;
      continue;
    }
    if (endRe.test(line)) {
      if (depth === 0) {
        throw new Error(`Dengesiz marker: kapanış var, açılış yok (@/feature:${feature})`);
      }
      depth -= 1;
      continue;
    }
    if (depth > 0) continue;
    if (inlineRe.test(line)) continue;
    out.push(line);
  }
  if (depth !== 0) {
    throw new Error(`Dengesiz marker: @feature:${feature} bloğu kapanmamış`);
  }
  return out.join('\n');
}

/** Manifest'teki ham desen kuralı (glob dışı kısmı — saf metin dönüşümü). */
export interface PatternRule {
  find: string;
  replace: string;
}

/**
 * Marker'la ifade EDİLEMEYEN dönüşümleri uygular (ör. Tailwind `dark:` sınıfları satır içinde,
 * kendi satırları olmadan yaşar). Ham regex marker sökmekten daha kırılgan olduğu için bu
 * fonksiyon saf tutulur ve manifest'teki gerçek desenlerle test edilir.
 */
export function applyPatterns(content: string, patterns: readonly PatternRule[]): string {
  let out = content;
  for (const { find, replace } of patterns) {
    out = out.replace(new RegExp(find, 'g'), replace);
  }
  return out;
}

/**
 * Marker süpürmesinin tarayacağı dosyalar. Çıkarma matrisi testi ve create-cli AYNI listeyi
 * kullanmalı; ayrışırlarsa süpürme kapsamı sessizce kayar.
 */
export const SWEEP_GLOBS = [
  'src/**/*.{astro,ts,mjs,css}',
  'src/**/__tests__/**/*.test.ts',
  'astro.config.mjs',
];

/**
 * Süpürme dışı bırakılanlar. `scripts/lib/__tests__/markers.test.ts` marker SÖZDİZİMİNİN kendi
 * fixture'ıdır: içindeki `@feature:*` metinleri işaretlenmiş kod değil, test verisidir.
 * Süpürülürse motor kendi testini bozar (`team` çıkarıldığında `// @feature:team` içeren
 * fixture satırı siliniyordu).
 */
export const SWEEP_IGNORE = ['node_modules/**', 'scripts/lib/__tests__/markers.test.ts'];
