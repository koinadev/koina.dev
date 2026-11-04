import { describe, expect, test } from 'bun:test';
import { extractMentions, extractTags, extractUrls } from '../src/modules/feed/domain/post-text';
import { rankPosts, scorePost, type RankInput } from '../src/modules/feed/domain/ranking';
import { rankLinks } from '../src/modules/links/domain/link-ranking';
import { screenText } from '../src/modules/moderation/domain/content-filter';
import { canonicalUrl } from '../src/modules/previews/domain/canonical-url';
import { isPublicHttpUrl } from '../src/modules/previews/domain/safe-url';
import { sniffImage, stripMetadata } from '../src/modules/media/domain/image';
import { foldText, searchTerm } from '../src/core/utils/fold';

describe('içerik süzgeci', () => {
  test.each(['amk', 'AMK!', 'siktir', 's i k t i r', 's.i.k.t.i.r', 'siiiiktir', '0r0spu', 'orospunun', 'fuuuck', 'motherfucker', 'yarrak', 'amına'])(
    'yakalar: %s',
    (text) => expect(screenText(`bu ${text} işte`).ok).toBe(false),
  );
  test.each(['amca', 'ama', 'sıkıntı', 'şikayet', 'sikayet', 'siklet', 'cok sik', 'yaram kanadı', 'Amina', 'dick', 'pic', 'göteborg'])(
    'masumu geçirir: %s',
    (text) => expect(screenText(`bu ${text} işte`).ok).toBe(true),
  );
});

describe('gönderi metni', () => {
  test('etiketler Türkçe küçük harfe iner ve tekilleşir; adres içindeki # etiket değildir', () => {
    expect(extractTags('#İmece ve #imece, #AçıkKaynak https://x.com/a#frag')).toEqual(['imece', 'açıkkaynak']);
  });
  test('anmalar ve e-posta karışmaz', () => {
    expect(extractMentions('@ada ve @bob-lee merhaba, yaz: ada@example.com')).toEqual(['ada', 'bob-lee']);
  });
  test('bağlantılar sondaki noktalamadan arınır', () => {
    expect(extractUrls('Bak: https://koina.dev/blog. Ve (https://x.dev/a?b=1)')).toEqual(['https://koina.dev/blog', 'https://x.dev/a?b=1']);
  });
});

describe('sıralama', () => {
  const now = new Date('2026-10-26T12:00:00Z');
  const base = (over: Partial<RankInput>): RankInput => ({
    id: 'x', userId: 'u', createdAt: now, claps: 0, repliers: 0, reposts: 0, quotes: 0, bookmarks: 0, reports: 0,
    authorTrust: 1, followed: false, myProject: false, inProject: false, rich: false, ...over,
  });
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

  test('etkileşim puanı artırır, yaş azaltır', () => {
    expect(scorePost(base({ claps: 5 }), now)).toBeGreaterThan(scorePost(base({}), now));
    expect(scorePost(base({ createdAt: hoursAgo(24) }), now)).toBeLessThan(scorePost(base({ createdAt: hoursAgo(1) }), now));
  });
  test('takip edilen yazar öne, şikâyetli ve yeni hesap geriye', () => {
    expect(scorePost(base({ followed: true }), now)).toBeGreaterThan(scorePost(base({}), now));
    expect(scorePost(base({ reports: 1 }), now)).toBeLessThan(scorePost(base({}), now));
    expect(scorePost(base({ authorTrust: 0 }), now)).toBeLessThan(scorePost(base({}), now));
  });
  test('bir yazar akışı dolduramaz', () => {
    const spam = Array.from({ length: 5 }, (_, i) => base({ id: `s${i}`, userId: 'spam', claps: 3, createdAt: hoursAgo(1) }));
    const other = base({ id: 'o', userId: 'other', claps: 1, createdAt: hoursAgo(1) });
    expect(rankPosts([...spam, other], now).indexOf('o')).toBeLessThan(3);
  });
  test('bağlantılar oyla yükselir', () => {
    const ids = rankLinks([
      { id: 'old-popular', createdAt: hoursAgo(24 * 10), votes: 30, reports: 0 },
      { id: 'new', createdAt: hoursAgo(1), votes: 0, reports: 0 },
    ], now);
    expect(ids[0]).toBe('old-popular');
  });
});

describe('adresler', () => {
  test('sadeleştirme: izleme parametreleri, www, parça, sondaki / ve şema', () => {
    expect(canonicalUrl('http://WWW.Example.com/a/?utm_source=x&b=2&a=1#top')).toBe('https://example.com/a?a=1&b=2');
    expect(canonicalUrl('https://example.com/')).toBe('https://example.com/');
  });
  test.each([
    ['https://koina.dev/x', true],
    ['http://example.com', true],
    ['https://example.com:8443', false],
    ['http://localhost', false],
    ['http://127.0.0.1', false],
    ['http://[::1]/', false],
    ['http://2130706433/', false],
    ['http://0x7f000001/', false],
    ['http://printer.local/', false],
    ['https://user:pass@example.com', false],
    ['ftp://example.com', false],
    ['javascript:alert(1)', false],
  ])('herkese açık mı: %s', (url, ok) => expect(isPublicHttpUrl(url)).toBe(ok));
});

describe('arama sadeleştirme', () => {
  test('Türkçe harfler', () => {
    expect(foldText('İSTANBUL ışığı Çağ Öğün Şük')).toBe('istanbul isigi cag ogun suk');
    expect(searchTerm(' a ')).toBeNull();
    expect(searchTerm('100%_x')).toBe('100x');
  });
});

describe('görsel', () => {
  test('tür baytlardan; JPEG EXIF bölümü atılır', () => {
    const exif = [0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
    const jpeg = new Uint8Array([0xff, 0xd8, ...exif, 0xff, 0xdb, 0x00, 0x03, 0x01, 0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9]);
    expect(sniffImage(jpeg)).toBe('image/jpeg');
    const out = stripMetadata(jpeg, 'image/jpeg');
    expect([...out].join(',')).not.toContain('69,102'); // "if" of Exif
    expect(out.length).toBe(jpeg.length - exif.length);
    expect(sniffImage(new TextEncoder().encode('<svg/>'))).toBeNull();
  });

  test('JPEG yön bilgisi tek başına korunur, geri kalan EXIF gider', () => {
    // Küçük-endian TIFF: Orientation=6 ve konum gibi duran ikinci bir girdi (0x8825 GPS IFD).
    const tiff = [0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x02, 0x00,
      0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00,
      0x25, 0x88, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00, 0x99, 0x99, 0x99, 0x99,
      0x00, 0x00, 0x00, 0x00];
    const length = 2 + 6 + tiff.length;
    const exif = [0xff, 0xe1, length >> 8, length & 0xff, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
    const body = [0xff, 0xdb, 0x00, 0x03, 0x01, 0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9];
    const out = stripMetadata(new Uint8Array([0xff, 0xd8, ...exif, ...body]), 'image/jpeg');
    expect([...out].join(',')).not.toContain('153,153,153,153');
    expect(out.length).toBe(2 + 36 + body.length);
    expect(out[31]).toBe(6); // SOI (2) + yön değerinin bölümdeki yeri (29)
  });
});
