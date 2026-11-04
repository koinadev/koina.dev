// Arama için sadeleştirme: Türkçe harfler ASCII karşılığına iner, sonra küçültülür. SQL tarafı aynı eşlemeyi `replace` zinciriyle
// yapar (packages/db/src/queries). Önce harfler değişir: JS'te 'İ'.toLowerCase() noktalı birleşik bir 'i̇' verir.
const FOLD: [string, string][] = [
  ['İ', 'i'], ['I', 'i'], ['ı', 'i'], ['Ş', 's'], ['ş', 's'], ['Ğ', 'g'], ['ğ', 'g'],
  ['Ü', 'u'], ['ü', 'u'], ['Ö', 'o'], ['ö', 'o'], ['Ç', 'c'], ['ç', 'c'],
];

export const foldText = (text: string): string => FOLD.reduce((t, [a, b]) => t.replaceAll(a, b), text).toLowerCase();

/** Arama girdisi: kırpılır, sadeleşir; boşsa `null` (süzgeç uygulanmaz). LIKE joker karakterleri düz metin sayılır. */
export function searchTerm(raw: string | undefined, max = 60): string | null {
  const term = foldText((raw ?? '').trim().slice(0, max)).replace(/[%_\\]/g, '');
  return term.length >= 2 ? term : null;
}
