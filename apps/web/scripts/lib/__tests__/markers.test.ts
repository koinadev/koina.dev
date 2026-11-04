import { describe, expect, it } from 'vitest';
import { applyPatterns, stripFeature } from '../markers';
import { features } from '../../../features.manifest';

describe('stripFeature', () => {
  it('js blok marker söker', () => {
    const input = 'const a = 1;\n/* @feature:blog */\nconst b = 2;\n/* @/feature:blog */\nconst c = 3;';
    expect(stripFeature(input, 'blog')).toBe('const a = 1;\nconst c = 3;');
  });
  it('html blok marker söker', () => {
    const input = '<p>kal</p>\n<!-- @feature:forms -->\n<Form />\n<!-- @/feature:forms -->\n<p>kal2</p>';
    expect(stripFeature(input, 'forms')).toBe('<p>kal</p>\n<p>kal2</p>');
  });
  it('satır marker sadece o satırı söker', () => {
    const input =
      "import a from 'a';\nimport b from 'b'; // @feature:blog\nimport c from 'c'; /* @feature:blog */";
    expect(stripFeature(input, 'blog')).toBe("import a from 'a';");
  });
  it('başka feature dokunulmaz', () => {
    const input = 'x\n/* @feature:forms */\ny\n/* @/feature:forms */';
    expect(stripFeature(input, 'blog')).toBe(input);
  });
  it('dengesiz marker hata fırlatır', () => {
    expect(() => stripFeature('/* @feature:blog */\nx', 'blog')).toThrow();
  });

  it('kapanmamış blok hatası özelliği ve yönü söyler', () => {
    expect(() => stripFeature('/* @feature:blog */\nx', 'blog')).toThrow(/@feature:blog.*kapanmamış/);
  });
  it('açılışsız kapanış hatası özelliği ve yönü söyler', () => {
    expect(() => stripFeature('x\n/* @/feature:blog */', 'blog')).toThrow(/@\/feature:blog/);
    expect(() => stripFeature('x\n/* @/feature:blog */', 'blog')).toThrow(/açılış yok/);
  });

  it('girintili blok marker söker (astro frontmatter)', () => {
    const input = 'const a = 1;\n  /* @feature:i18n */\n  const b = 2;\n  /* @/feature:i18n */\nconst c = 3;';
    expect(stripFeature(input, 'i18n')).toBe('const a = 1;\nconst c = 3;');
  });
  it('html satır marker söker', () => {
    const input = '<a/>\n<Team /> <!-- @feature:team -->\n<b/>';
    expect(stripFeature(input, 'team')).toBe('<a/>\n<b/>');
  });
  it('iç içe aynı feature bloklarını sayar', () => {
    const input =
      'a\n/* @feature:blog */\nb\n/* @feature:blog */\nc\n/* @/feature:blog */\nd\n/* @/feature:blog */\ne';
    expect(stripFeature(input, 'blog')).toBe('a\ne');
  });
  it('içteki başka feature marker satırlarını da söker', () => {
    const input = '/* @feature:i18n */\nx // @feature:blog\n/* @/feature:i18n */\nkal';
    expect(stripFeature(input, 'i18n')).toBe('kal');
  });

  // Ad çakışması: bir feature adı başka bir adın ön eki olduğunda karıştırılmamalı.
  it("ön ek çakışması: team, teams marker'ına dokunmaz", () => {
    const input = "export * from './teams'; // @feature:teams\nexport * from './team'; // @feature:team";
    expect(stripFeature(input, 'team')).toBe("export * from './teams'; // @feature:teams");
  });
  it("ön ek çakışması: teams blok marker'ı team ile sökülmez", () => {
    const input = '/* @feature:teams */\nx\n/* @/feature:teams */';
    expect(stripFeature(input, 'team')).toBe(input);
  });
  it('tireli ad: case-studies sökülür, case sökmez', () => {
    const input = "export * from './case-studies'; // @feature:case-studies";
    expect(stripFeature(input, 'case-studies')).toBe('');
    expect(stripFeature(input, 'case')).toBe(input);
  });

  it('regex metakarakterli ad literal eşleşir', () => {
    const input = 'a\n/* @feature:a.c */\nx\n/* @/feature:a.c */\nb';
    expect(stripFeature(input, 'a.c')).toBe('a\nb');
    // '.' literal olmalı: 'abc' marker'ı 'a.c' ile eşleşmemeli.
    expect(stripFeature('a\n/* @feature:abc */\nx\n/* @/feature:abc */\nb', 'a.c')).toBe(
      'a\n/* @feature:abc */\nx\n/* @/feature:abc */\nb',
    );
  });

  it('marker yoksa içerik aynen döner (satır sonu korunur)', () => {
    const input = 'a\nb\n';
    expect(stripFeature(input, 'blog')).toBe(input);
  });
});

// `dark-mode` deseni marker'la değil HAM REGEX ile çalışır; en riskli yol burasıdır. Testler
// manifest'teki GERÇEK deseni kullanır (kopyasını değil), böylece manifest değişirse test kırılır.
describe('applyPatterns — dark-mode sınıf deseni', () => {
  const darkPatterns = features['dark-mode'].patterns ?? [];

  const cases: [baslik: string, girdi: string, beklenen: string][] = [
    [
      'hex arbitrary value: önceki sınıfa yapışmaz',
      'class="bg-white dark:bg-[#0b1220] p-4"',
      'class="bg-white p-4"',
    ],
    ['varyant öneki (md:) tamamen gider', 'class="p-4 md:dark:bg-gray-900"', 'class="p-4"'],
    ['parantezli arbitrary value bölünmez', 'class="dark:bg-[rgb(11,18,32)] p-4"', 'class="p-4"'],
    ['group-hover: öneki tamamen gider', 'class="group-hover:dark:text-white p-4"', 'class="p-4"'],
    ['tek sınıf: liste boşalır', 'class="dark:aria-pressed:text-white"', 'class=""'],
    ['dark yoksa içerik değişmez', 'class="p-4 text-sm"', 'class="p-4 text-sm"'],

    // Depodaki gerçek kullanımlar (class attribute'u DIŞINDA):
    [
      'CSS @apply: noktalı virgül korunur',
      'body { @apply bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100; }',
      'body { @apply bg-white text-gray-900; }',
    ],
    [
      'tek tırnaklı sınıf dizesi (class:list / TS sabiti)',
      "const c = 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800';",
      "const c = 'text-gray-700 hover:bg-gray-100';",
    ],
    [
      'ters tırnak içindeki yorum metni temiz kesilir, komşuya yapışmaz',
      'statik `dark:text-gray-300` yönetilmediği',
      'statik `` yönetilmediği',
    ],
    [
      'dark bir sınıf ADININ parçasıysa dokunulmaz',
      'class="bg-darker not-dark:text-white"',
      'class="bg-darker not-dark:text-white"',
    ],
  ];

  for (const [baslik, girdi, beklenen] of cases) {
    it(baslik, () => {
      expect(applyPatterns(girdi, darkPatterns)).toBe(beklenen);
    });
  }
});

// `analytics` de HAM REGEX kullanır (olay öznitelikleri satır İÇİNDE yaşar). Aynı gerekçe:
// manifest'teki GERÇEK desenle test edilir, kopyasıyla değil.
describe('applyPatterns — analytics olay öznitelikleri', () => {
  const analyticsPatterns = features['analytics'].patterns ?? [];

  const cases: [baslik: string, girdi: string, beklenen: string][] = [
    [
      'çağrı yeri: tek prop temiz gider',
      '<Button href="/x" analytics={{ event: \'hero_cta\' }}>Başla</Button>',
      '<Button href="/x">Başla</Button>',
    ],
    [
      'çağrı yeri: bağlam anahtarlarıyla birlikte gider',
      '<Button analytics={{ event: \'pricing_cta\', plan: plan.name }} class="mt-8">',
      '<Button class="mt-8">',
    ],
    [
      'Button.astro: spread gider, komşu öznitelikler kalır',
      '<a {href} class:list={classes} {...analyticsAttrs}>',
      '<a {href} class:list={classes}>',
    ],
    [
      'analytics YOKSA içerik değişmez',
      '<Button href="/x" class="mt-8">Başla</Button>',
      '<Button href="/x" class="mt-8">Başla</Button>',
    ],
    [
      'benzer adlı prop YANLIŞLIKLA eşleşmez',
      '<Chart analyticsSummary={{ total: 3 }} />',
      '<Chart analyticsSummary={{ total: 3 }} />',
    ],
  ];

  for (const [baslik, girdi, beklenen] of cases) {
    it(baslik, () => {
      expect(applyPatterns(girdi, analyticsPatterns)).toBe(beklenen);
    });
  }
});
