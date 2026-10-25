import type { MoveRule } from './scripts/lib/moves';

export interface FeatureDef {
  description: string;
  files?: string[];
  dependencies?: string[];
  patterns?: { glob: string; find: string; replace: string }[];
  /** Silme adımından SONRA uygulanan dosya taşımaları (bkz. scripts/lib/moves.ts). */
  moves?: MoveRule[];
}

// --- `dark:` sınıf deseni ---------------------------------------------------------------------
// Tek satırlık ham regex yerine parçalardan kuruluyor: bu desen marker'sız, satır İÇİNDE çalışan
// tek dönüşüm olduğu için motorun en riskli yolu. Davranışı scripts/lib/__tests__/markers.test.ts'te
// manifest'ten OKUNARAK kilitlendi (kopya desenle değil), böylece buradaki her değişiklik testle karşılaşır.

// Arbitrary value tek parça sayılır: `[#0b1220]`, `[rgb(11,18,32)]`, `[&>*]`. İçindeki `#`, `,`,
// `(` `)` ve `:` sınıfı BÖLMEZ — eski desenin `bg-white`ı yok etmesinin sebebi buydu.
const ARBITRARY = '\\[[^\\]]*\\]';
// Sınıfı bitiren sınırlar: boşluk, üç tırnak biçimi (HTML/TS/template literal) ve CSS'te
// `@apply ...;` noktalı virgülü. `:` ve `/` sınıf İÇİNDE geçerli olduğu için sınır değil.
const CLASS_CHAR = `(?:${ARBITRARY}|[^\\s"'\`;\\[\\]])`;
// Varyant segmenti + ayırıcısı: `md:`, `group-hover:`, `supports-[display:grid]:`.
const VARIANT = `(?:${ARBITRARY}|[^\\s"'\`;:\\[\\]])+:`;
// `dark:` yalnızca varyant SINIRINDA eşleşir (satır başı ya da bir `:` ardından); böylece
// `bg-darker` ve `not-dark:text-white` gibi sınıflar korunur.
const DARK_CLASS = `(?:${VARIANT})*dark:${CLASS_CHAR}*`;
// SOL SINIR ŞART. İki alternatif: (1) sınıfın ÖNÜNDEKİ boşlukla birlikte sil — listenin ortasında
// ya da sonunda olan sınıflar için; (2) sınıf listenin başındaysa (öncesi satır başı/boşluk/tırnak)
// ARDINDAKİ boşlukla birlikte sil. Böylece ne kalıntı komşu sınıfa yapışır ne de çift boşluk kalır.
const DARK_CLASS_PATTERN = `[ \\t]+${DARK_CLASS}|(?<![^\\s"'\`])${DARK_CLASS}[ \\t]*`;

export const features: Record<string, FeatureDef> = {
  i18n: {
    description: 'Çoklu dil desteği (EN kaldırılır, TR prefixsiz köke iner)',
    files: [
      'src/pages/en',
      // Kök `index.astro` DİL ALGILAYAN yönlendirme stub'ı; tek dil kalınca anlamsız. Ayrıca
      // aşağıdaki taşımadan ÖNCE silinmesi ŞART — yoksa `src/pages/tr/index.astro` ile çakışır.
      'src/pages/index.astro',
      // Tüm İngilizce mesajlar (eski ayrı `src/data/en` + `src/i18n/en.json` tek klasörde
      // birleşti) TEK dizin, tek girdi.
      'src/messages/en',
      'content/blog/en',
      // Header'daki dil değiştirici tıklamasını `localStorage`'a yazan modül; Header.astro'nun
      // kendisi çekirdek olduğu için ayrı dosyada durur (bkz. dark-mode/analytics'teki aynı gerekçe).
      'src/lib/locale-switch.ts',
    ],
    // Prefixli routing tek dilde anlamsız: `/tr/iletisim` → `/iletisim`. Silme adımı taşımadan
    // ÖNCE çalışır (bkz. scripts/remove-feature.ts), bu yüzden kök stub'ı burada güvenle gitmiş
    // olur ve birleştirme çakışmasız tamamlanır.
    moves: [{ from: 'src/pages/tr', to: 'src/pages' }],
  },
  'dark-mode': {
    description: 'Karanlık tema (toggle, tema scripti, dark: sınıfları)',
    files: ['src/components/ui/ThemeToggle.astro', 'src/lib/theme-toggle.ts'],
    patterns: [{ glob: 'src/**/*.{astro,css}', find: DARK_CLASS_PATTERN, replace: '' }],
  },
  analytics: {
    description: 'Analytics, olay izleme ve cookie consent',
    files: [
      'src/components/Analytics.astro',
      'src/components/ConsentBanner.astro',
      // ConsentBanner.astro'nun tıklama/görünürlük mantığı; bileşenle birlikte gitmesi gerekir.
      'src/lib/consent-banner.ts',
      // Olay katmanı (`track()` + delege tıklama dinleyicisi) ve davranış testi.
      'src/lib/analytics.ts',
      'src/lib/__tests__/analytics.test.ts',
      // Analytics.astro'nun KAYNAK METNİNİ okuyan regresyon kilidi; bileşen gidince sahipsiz
      // kalır ve ENOENT ile suite'i çökertir. Kendi dosyasında durmasının sebebi budur.
      'src/components/__tests__/spa-analytics.test.ts',
    ],
    // Olay öznitelikleri satır İÇİNDE yaşıyor (bir `<Button>` etiketinin ortasında), yani
    // marker'la ifade edilemezler — `dark:` sınıflarıyla aynı durum. İki desen de LİTERAL:
    // `analytics={{ ... }}` çağrı yerlerinde, `{...analyticsAttrs}` yalnızca Button.astro'da.
    // Tek satırlık nesne değişmezi varsayımı bilinçli ve Button.astro'nun Props yorumunda yazılı;
    // `[^{}]*` iç içe süslü parantez KABUL ETMEZ, böylece desen sessizce fazla yemez.
    patterns: [
      { glob: 'src/**/*.astro', find: '[ \\t]+analytics=\\{\\{[^{}]*\\}\\}', replace: '' },
      { glob: 'src/**/*.astro', find: '[ \\t]+\\{\\.\\.\\.analyticsAttrs\\}', replace: '' },
    ],
  },
  blog: {
    description: 'Blog, content collections ve RSS',
    files: [
      // İçerik `src/` DIŞINDA, repo kökünde: `content/` bir kaynaktır, kod değil.
      'content',
      'src/content.config.ts',
      // Koleksiyonun loader'ı ve blog'a özel kapak bileşeni — blog gidince ikisi de sahipsiz kalır.
      'src/loaders',
      'src/components/blog',
      // HER İKİ yerleşim de listeleniyor: i18n ÖNCE çıkarılmışsa blog sayfaları `src/pages/tr`'den
      // köke taşınmış olur (`src/pages/blog`). Var olmayan yollar sessizce atlanır.
      'src/pages/tr/blog',
      'src/pages/en/blog',
      'src/pages/blog',
      'src/pages/tr/rss.xml.ts',
      'src/pages/en/rss.xml.ts',
      'src/pages/rss.xml.ts',
      // formatDate/readingTime YALNIZCA blog sayfaları tarafından kullanılıyor; blog gidince
      // ölü kod kalmasın diye testiyle birlikte siliniyor.
      'src/lib/utils.ts',
      'src/__tests__/utils.test.ts',
      // Blog UI dizeleri (başlık, "devamını oku" vb.) — blog gidince sahipsiz kalmasın.
      'src/messages/tr/blog.json',
      'src/messages/en/blog.json',
    ],
    // NOT: `@plugin '@tailwindcss/typography';` satırı global.css'te zaten `@feature:blog`
    // bloğunun içinde; marker süpürmesi desenlerden ÖNCE çalıştığı için ayrıca bir `patterns`
    // girdisi hiç eşleşmiyordu (ölü kural) — kaldırıldı.
    dependencies: ['@astrojs/rss', '@tailwindcss/typography'],
  },
  'blog-remote': {
    description: 'Blog içeriğini uzak bir JSON kaynağından çekme (opsiyonel adaptör)',
    // Uzak mantığın tamamı TEK dosyada durur; `src/loaders/blog.ts` içindeki iki satır marker'la
    // süpürülür. Böylece çıkarma sonrası ne ölü tip ne de sahipsiz yardımcı kalır.
    //
    // `__tests__` dizininin TAMAMI da gidiyor: içindeki iki dosyanın da tek konusu uzak kaynak.
    // `blog.test.ts` loader'ın DALLANMASINI sınar (endpoint var/yok) — uzak kaynak çıkınca
    // dallanma da kalmaz, `blogLoader` ince bir glob sarmalayıcısına iner ve test konusuz kalır.
    // Ayrıca `vi.mock('../blog-remote')` silinmiş bir dosyaya çözümlenmeye çalışırdı.
    files: ['src/loaders/blog-remote.ts', 'src/loaders/__tests__'],
  },
  forms: {
    description: 'İletişim formu, Turnstile ve provider adaptörleri',
    files: [
      'src/components/sections/ContactForm.astro',
      // Lokalize slug'lı iletişim sayfaları. Kökteki `iletisim.astro` i18n ÖNCE çıkarıldığında
      // oluşan yerleşimdir (bkz. blog girdisindeki aynı gerekçe).
      'src/pages/tr/iletisim.astro',
      'src/pages/en/contact.astro',
      'src/pages/iletisim.astro',
      // Bu statik projede `src/pages/api` yoktur. Gönderim, ortak istemci üzerinden ayrı custom
      // Worker'a veya harici sağlayıcıya delege edilir. `src/env.d.ts` analytics global'lerini de
      // taşıdığı için dosya kalır; Turnstile tipi marker süpürmesiyle çıkarılır.
      'src/messages/tr/contact.json',
      'src/messages/en/contact.json',
      // Turnstile çizim/kaldırma + gönderim akışı; ContactForm.astro yalnızca çağırır.
      'src/lib/contact-form.ts',
      // Custom Worker / Formspark / Web3Forms payload ve başarı sözleşmesi.
      'src/api/services/contact.service.ts',
      'src/__tests__/contact-service.test.ts',
      // ContactForm.astro'nun KAYNAK METNİNİ okuyan regresyon kilidi (bkz. analytics girdisi).
      'src/components/sections/__tests__/spa-forms.test.ts',
    ],
  },
  pricing: {
    description: 'Fiyatlandırma tablosu',
    files: [
      'src/components/sections/Pricing.astro',
      'src/lib/pricing.ts',
      'src/messages/tr/pricing.json',
      'src/messages/en/pricing.json',
    ],
  },
  testimonials: {
    description: 'Müşteri yorumları slider’ı',
    files: [
      'src/components/sections/Testimonials.astro',
      'src/lib/testimonials.ts',
      'src/messages/tr/testimonials.json',
      'src/messages/en/testimonials.json',
    ],
  },
  team: {
    description: 'Ekip bölümü',
    files: ['src/components/sections/Team.astro', 'src/messages/tr/team.json', 'src/messages/en/team.json'],
  },
  'case-studies': {
    description: 'Başarı hikayeleri kartları',
    files: [
      'src/components/sections/CaseStudies.astro',
      'src/messages/tr/case-studies.json',
      'src/messages/en/case-studies.json',
    ],
  },
  newsletter: {
    description: 'Bülten kayıt formu',
    files: [
      'src/components/sections/Newsletter.astro',
      'src/messages/tr/newsletter.json',
      'src/messages/en/newsletter.json',
    ],
  },
};
