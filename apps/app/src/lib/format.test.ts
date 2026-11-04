import { describe, expect, it } from 'vitest';
import { excerpt, groupByDay, initials, linkify, parseTags, resolveUrl, richText, safeNext, shortAgo, swatchFor, swatches, uniqueById } from './format';

describe('linkify', () => {
  it('bağlantıyı ayırır, sondaki noktalamayı metinde bırakır', () => {
    expect(linkify('bkz. https://koina.dev/blog. Sonra')).toEqual([
      { kind: 'text', value: 'bkz. ' },
      { kind: 'link', value: 'koina.dev/blog', href: 'https://koina.dev/blog' },
      { kind: 'text', value: '. Sonra' },
    ]);
  });
  it('bağlantısız metni tek parça döndürür', () => {
    expect(linkify('selam\nnasılsın')).toEqual([{ kind: 'text', value: 'selam\nnasılsın' }]);
  });
  it('javascript: gibi şemaları bağlantı saymaz', () => {
    expect(linkify('javascript:alert(1)').every((s) => s.kind === 'text')).toBe(true);
  });
});

describe('shortAgo', () => {
  const now = new Date('2026-10-26T12:00:00Z');
  it('dakika, saat ve gün', () => {
    expect(shortAgo('2026-10-26T11:55:00Z', now, 'tr')).toBe('5 dk');
    expect(shortAgo('2026-10-26T09:00:00Z', now, 'tr')).toBe('3 sa');
    expect(shortAgo('2026-10-24T12:00:00Z', now, 'en')).toBe('2d');
    expect(shortAgo('2026-10-26T12:00:00Z', now, 'tr')).toBe('şimdi');
  });
});

describe('groupByDay', () => {
  it('Türkiye saatine göre gruplar: 22:00 UTC ertesi gündür', () => {
    const groups = groupByDay([
      { startsAt: '2026-10-27T18:00:00Z' },
      { startsAt: '2026-10-27T22:00:00Z' },
    ]);
    expect(groups.map((g) => g.day)).toEqual(['2026-10-27', '2026-10-28']);
  });
});

describe('safeNext', () => {
  it('yalnız uygulama içi yollar', () => {
    expect(safeNext('/akis/1')).toBe('/akis/1');
    expect(safeNext('//kotu.site')).toBe('/home');
    expect(safeNext('https://kotu.site')).toBe('/home');
    expect(safeNext('/giris')).toBe('/home');
    expect(safeNext(null)).toBe('/home');
  });
});

describe('küçükler', () => {
  it('resolveUrl göreli yolu köke bağlar', () => {
    expect(resolveUrl('/tr/blog/x', 'http://localhost:4321')).toBe('http://localhost:4321/tr/blog/x');
  });
  it('initials ve swatchFor kararlı', () => {
    expect(initials('ece yıldız')).toBe('EY');
    expect(swatches).toContain(swatchFor('deniz-kaya'));
    expect(swatchFor('deniz-kaya')).toBe(swatchFor('deniz-kaya'));
  });
  it('parseTags tekrarı ve boşları atar', () => {
    expect(parseTags(' Go, go ,, Postgres ')).toEqual(['go', 'postgres']);
  });
});

describe('richText', () => {
  it('bağlantı, etiket ve anmayı ayırır', () => {
    expect(richText('Selam @deniz-kaya, bkz. https://koina.dev/x. #açıkveri')).toEqual([
      { kind: 'text', value: 'Selam ' },
      { kind: 'mention', value: '@deniz-kaya', handle: 'deniz-kaya' },
      { kind: 'text', value: ', bkz. ' },
      { kind: 'url', value: 'koina.dev/x', href: 'https://koina.dev/x' },
      { kind: 'text', value: '. ' },
      { kind: 'tag', value: '#açıkveri', tag: 'açıkveri' },
    ]);
  });
  it('bağlantının içindeki # ve @ etiket sayılmaz', () => {
    const segs = richText('https://x.dev/a#b ve https://x.dev/@ali');
    expect(segs.filter((s) => s.kind === 'tag' || s.kind === 'mention')).toEqual([]);
  });
  it('e-posta adresi anma değildir', () => {
    expect(richText('mail: ali@koina.dev').some((s) => s.kind === 'mention')).toBe(false);
  });
  it('HTML metin olarak kalır', () => {
    expect(richText('<img src=x onerror=alert(1)>')).toEqual([{ kind: 'text', value: '<img src=x onerror=alert(1)>' }]);
  });
});

describe('excerpt ve uniqueById', () => {
  it('uzun metni kelime sınırında keser', () => {
    const out = excerpt('bir iki üç dört beş altı yedi sekiz', 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out.endsWith('…')).toBe(true);
  });
  it('tekrar eden kimliği atar', () => {
    expect(uniqueById([{ id: 'a' }, { id: 'b' }, { id: 'a' }]).map((x) => x.id)).toEqual(['a', 'b']);
  });
});
