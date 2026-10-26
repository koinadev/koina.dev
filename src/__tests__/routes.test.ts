import { describe, expect, it } from 'vitest';
import { alternatesFor, isActiveNav, localizedHref, navHref, routePath, routes } from '../i18n/routes';
import { blogPostPath, blogSlugFromId } from '../i18n/routes'; // @feature:blog
import { locales } from '../i18n/utils';

// i18n varken tüm diller ön ekli (`/tr/...`); çıkarıldığında tek dil köke iner (`/...`).
// Beklentiler bu yüzden ön eki değişkenden alır — iki modda da aynı test geçerli kalır.
let prefix = '';
prefix = '/tr'; // @feature:i18n

describe('routePath', () => {
  // SONDAKİ SLASH YOK: Astro `build.format: 'file'` ile `/tr/iletisim.html` üretir ve o sayfanın
  // kanonik URL'i `/tr/iletisim` olur. Yollar bu biçimi taşımazsa hreflang ve iç linkler kanonik
  // URL'den farklı olur.
  it('ana sayfa dilin köküdür', () => {
    expect(routePath('home', 'tr')).toBe(prefix || '/');
  });
  it('lokalize slug: TR iletişim', () => {
    expect(routePath('contact', 'tr')).toBe(`${prefix}/iletisim`); // @feature:forms
    expect(routePath('privacy', 'tr')).toBe(`${prefix}/gizlilik`);
  });
  /* @feature:i18n */
  it('ikincil dil kendi ön ekini ve kendi slug’ını alır', () => {
    expect(routePath('home', 'en')).toBe('/en');
    expect(routePath('contact', 'en')).toBe('/en/contact'); // @feature:forms
    expect(routePath('privacy', 'en')).toBe('/en/privacy');
  });
  /* @/feature:i18n */
  /* @feature:blog */
  it('blog yolları', () => {
    expect(routePath('blog', 'tr')).toBe(`${prefix}/blog`);
    expect(blogPostPath('hosgeldiniz', 'tr')).toBe(`${prefix}/blog/hosgeldiniz`);
    expect(blogPostPath('welcome', 'en')).toBe('/en/blog/welcome'); // @feature:i18n
  });
  /* @/feature:blog */
  it('her route her dil için tanımlıdır ve slash ile bitmez', () => {
    for (const key of Object.keys(routes) as (keyof typeof routes)[]) {
      for (const locale of locales) {
        const path = routePath(key, locale);
        expect(path.startsWith('/')).toBe(true);
        if (path !== '/') expect(path.endsWith('/')).toBe(false);
        // i18n varken her dil KENDİ ön ekini taşır; çıkarıldıktan sonra ön ek yoktur.
        expect(path === `/${locale}` || path.startsWith(`/${locale}/`)).toBe(true); // @feature:i18n
      }
    }
  });
});

describe('alternatesFor', () => {
  it('tüm dilleri kapsar', () => {
    const alternates = alternatesFor('privacy');
    expect(Object.keys(alternates).sort()).toEqual([...locales].sort());
    expect(alternates.tr).toBe(`${prefix}/gizlilik`);
  });
  /* @feature:i18n */
  it('lokalize slug’ları diller arası eşler', () => {
    expect(alternatesFor('privacy').en).toBe('/en/privacy');
  });
  /* @/feature:i18n */
});

describe('localizedHref', () => {
  // KRİTİK: `/tr/iletisim` sayfasındayken çıplak `#features` hiçbir yere gitmez.
  it('hash linkini o dilin ana sayfasına bağlar', () => {
    expect(localizedHref('#features', 'tr')).toBe(`${prefix || '/'}#features`);
    expect(localizedHref('#features', 'en')).toBe('/en#features'); // @feature:i18n
  });
  it('hash olmayan değerleri olduğu gibi bırakır', () => {
    expect(localizedHref('https://example.com/x', 'tr')).toBe('https://example.com/x');
  });
});

describe('navHref', () => {
  it('route anahtarını lokalize yola çözer', () => {
    expect(navHref({ label: 'Gizlilik', route: 'privacy' }, 'tr')).toBe(`${prefix}/gizlilik`);
  });
  it('hash girdisini ana sayfaya bağlar', () => {
    expect(navHref({ label: 'SSS', hash: '#faq' }, 'tr')).toBe(`${prefix || '/'}#faq`);
  });
  it('ikisi de yoksa ana sayfaya düşer', () => {
    expect(navHref({ label: 'Ana sayfa' }, 'tr')).toBe(prefix || '/');
  });
});

describe('isActiveNav', () => {
  it('aynı route anahtarını taşıyan link aktiftir', () => {
    expect(isActiveNav({ label: 'Gizlilik', route: 'privacy' }, 'privacy')).toBe(true);
  });
  it('farklı route aktif değildir', () => {
    expect(isActiveNav({ label: 'Gizlilik', route: 'privacy' }, 'home')).toBe(false);
  });
  // Hash girdileri ana sayfa İÇİNDEKİ bölümlerdir; ana sayfadayken bile "aktif sayfa" değiller.
  it('hash girdisi hiçbir zaman aktif değildir', () => {
    expect(isActiveNav({ label: 'SSS', hash: '#faq' }, 'home')).toBe(false);
  });
  // 404 gibi registry'de karşılığı olmayan sayfalar route vermez: hiçbir link aktif olmamalı.
  it('route bilinmiyorsa hiçbir link aktif değildir', () => {
    expect(isActiveNav({ label: 'Gizlilik', route: 'privacy' }, undefined)).toBe(false);
    expect(isActiveNav({ label: 'SSS', hash: '#faq' }, undefined)).toBe(false);
  });
});

/* @feature:blog */
describe('blogSlugFromId', () => {
  it('dil ön ekini SLASH ayracıyla soyar', () => {
    expect(blogSlugFromId('tr/hosgeldiniz', 'tr')).toBe('hosgeldiniz');
    expect(blogSlugFromId('en/welcome', 'en')).toBe('welcome'); // @feature:i18n
  });

  // REGRESYON KİLİDİ: bu ayıklama 8 çağrı yerine ELLE kopyalanmıştı ve ikisinde ayraç TİRE
  // yazılmıştı (`/^en-/`). Regex hiç eşleşmediği için ön ek olduğu gibi kalıyor, üretilen adres
  // `/en/blog/en/welcome` oluyordu — dil değiştirici ve hreflang 404'e gidiyordu.
  //
  // Assertion BİLEREK `tr` üzerinden yazıldı: tek dilli (i18n çıkarılmış) kurulumda da anlamlı
  // kalsın diye. Orada yol `/blog/hosgeldiniz` olur ve `/blog/tr/` yine içermemelidir.
  it('ön ek soyulduktan sonra yol dil segmentini İKİ KEZ taşımaz', () => {
    expect(blogPostPath(blogSlugFromId('tr/hosgeldiniz', 'tr'), 'tr')).not.toContain('/blog/tr/');
    expect(blogPostPath(blogSlugFromId('en/welcome', 'en'), 'en')).toBe('/en/blog/welcome'); // @feature:i18n
  });

  // Desteklenmeyen bir dil ön eki aktif locale olarak yorumlanırsa slug bozulur; ön ek
  // eşleşmiyorsa id olduğu gibi dönmeli. `fr` bilerek seçildi: CLI'nin tek-dil dönüşümü
  // `tr`/`en` token'larını yeniden etiketlese de bu fixture aynı anlamı korur.
  it('kendi diline ait olmayan ön eki SOYMAZ', () => {
    expect(blogSlugFromId('fr/welcome', 'tr')).toBe('fr/welcome');
  });

  it("iç içe slug'larda yalnızca İLK segmenti soyar", () => {
    expect(blogSlugFromId('tr/2026/duyuru', 'tr')).toBe('2026/duyuru');
  });
});
/* @/feature:blog */
