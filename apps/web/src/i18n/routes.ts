import { locales, type Locale } from './utils';

// Route anahtarı → her dilin YOL PARÇASI (dil ön eki ve sondaki `/` hariç).
//
// `Record<...>` anotasyonu EKLENMEZ: `keyof typeof routes` `string`e genişler ve `RouteKey`
// tip güvenliğini kaybeder (bkz. src/i18n/utils.ts, aynı tuzak).
//
// Her dil kendi satırında: satır sonu marker'ı `en` girdisini tek başına sökebilsin diye.
// (Marker'ın kendisi bu yorumda yazılamaz — süpürme onu gerçek marker sanır; bkz.
// src/__tests__/marker-hygiene.test.ts.)
export const routes = {
  home: {
    tr: '',
    en: '', // @feature:i18n
  },
  /* @feature:blog */
  blog: {
    tr: '/blog',
    en: '/blog', // @feature:i18n
  },
  /* @/feature:blog */
  /* @feature:forms */
  contact: {
    tr: '/iletisim',
    en: '/contact', // @feature:i18n
  },
  /* @/feature:forms */
  privacy: {
    tr: '/gizlilik',
    en: '/privacy', // @feature:i18n
  },
  signup: {
    tr: '/kayit',
    en: '/signup', // @feature:i18n
  },
  links: {
    tr: '/baglantilar',
    en: '/links', // @feature:i18n
  },
  about: {
    tr: '/hakkimizda',
    en: '/about', // @feature:i18n
  },
  why: {
    tr: '/neden-kurulduk',
    en: '/why-we-exist', // @feature:i18n
  },
  manifesto: {
    tr: '/manifesto',
    en: '/manifesto', // @feature:i18n
  },
  imece: {
    tr: '/imece',
    en: '/imece', // @feature:i18n
  },
  howItWorks: {
    tr: '/nasil-calisir',
    en: '/how-it-works', // @feature:i18n
  },
  learners: {
    tr: '/yeni-baslayanlar-icin',
    en: '/for-beginners', // @feature:i18n
  },
  mentors: {
    tr: '/ustalar-icin',
    en: '/for-mentors', // @feature:i18n
  },
  founders: {
    tr: '/fikir-sahipleri-icin',
    en: '/for-founders', // @feature:i18n
  },
  projects: {
    tr: '/projeler',
    en: '/projects', // @feature:i18n
  },
  events: {
    tr: '/etkinlikler',
    en: '/events', // @feature:i18n
  },
  streams: {
    tr: '/canli-yayinlar',
    en: '/live', // @feature:i18n
  },
  sponsor: {
    tr: '/sponsorluk',
    en: '/sponsorship', // @feature:i18n
  },
  faq: {
    tr: '/sss',
    en: '/faq', // @feature:i18n
  },
  conduct: {
    tr: '/davranis-kurallari',
    en: '/code-of-conduct', // @feature:i18n
  },
  licensing: {
    tr: '/lisans',
    en: '/licensing', // @feature:i18n
  },
};

export type RouteKey = keyof typeof routes;

/** Bir sayfanın tüm dillerdeki karşılıkları: hreflang ve dil değiştirici bunu tüketir. */
export type Alternates = Record<Locale, string>;

/** Header/Footer navigasyon girdisi: ya bir route anahtarı ya da ana sayfa içi bir hash. */
export interface NavLink {
  label: string;
  route?: RouteKey;
  hash?: string;
}

// Sondaki slash YOK: `build.format: 'file'` + `trailingSlash: 'never'` (astro.config.mjs).
// Kanonik URL, sitemap ve hreflang aynı biçimi kullanmalı yoksa kanonik kendi hreflang'inden
// farklı olur.
/** `/tr`, `/tr/iletisim`, `/en/contact` — sondaki slash olmadan; yalnız kök `/`. */
export function routePath(key: RouteKey, locale: Locale): string {
  // Dil ön eki ayrı satırda ve marker'lı: i18n çıkarıldığında ön ek de gitmeli, şablon içine
  // gömülseydi çıkarma sonrası tüm iç linkler var olmayan `/tr/...` yollarını gösterirdi.
  let path: string = routes[key][locale];
  path = `/${locale}${path}`; // @feature:i18n
  return path || '/';
}

/* @feature:blog */
/**
 * Koleksiyon id'sinden (`<locale>/<slug>`) o dilin slug'ını çıkarır.
 *
 * TEK YERDE durmasının sebebi ölçülmüş bir hata: bu ayıklama 8 ayrı çağrı yerine elle
 * kopyalanmıştı ve ikisinde ayraç yanlış yazılmıştı (`/^en-/` — tire, oysa id'ler `/` ile
 * ayrılıyor). Regex hiç eşleşmediği için ön ek olduğu gibi kalıyor, dil değiştirici ve hreflang
 * `/en/blog/en/welcome/` gibi var olmayan bir adrese gidiyordu. Kopya kalmadığı sürece aynı hata
 * tekrar edemez.
 */
export function blogSlugFromId(id: string, locale: Locale): string {
  const prefix = `${locale}/`;
  return id.startsWith(prefix) ? id.slice(prefix.length) : id;
}

/** Blog yazısı yolu: `/tr/blog/<slug>`. */
export function blogPostPath(slug: string, locale: Locale): string {
  return `${routePath('blog', locale)}/${slug}`;
}
/* @/feature:blog */

/** Bir route'un tüm dillerdeki karşılıkları. */
export function alternatesFor(key: RouteKey): Alternates {
  // `Object.fromEntries` `{ [k: string]: string }` döner; anahtar kümesi `locales` ile aynı
  // olduğu için daraltma güvenli.
  return Object.fromEntries(locales.map((locale) => [locale, routePath(key, locale)])) as Alternates;
}

/**
 * Hash linklerini o dilin ana sayfasına bağlar: `/tr/iletisim` sayfasındayken çıplak `#features`
 * hiçbir yere gitmez, hedef bölüm ana sayfada. Hash olmayan değerler olduğu gibi döner.
 */
export function localizedHref(hrefOrHash: string, locale: Locale): string {
  return hrefOrHash.startsWith('#') ? `${routePath('home', locale)}${hrefOrHash}` : hrefOrHash;
}

/** Navigasyon girdisini o dildeki gerçek href'e çevirir. */
export function navHref(link: NavLink, locale: Locale): string {
  if (link.route) return routePath(link.route, locale);
  if (link.hash) return localizedHref(link.hash, locale);
  return routePath('home', locale);
}

/**
 * Nav girdisi şu anki route'u mu gösteriyor? Pathname string'i karşılaştırılmaz — sayfa kendi
 * route anahtarını bildirir, karşılaştırma registry üzerinden yapılır (yol karşılaştırması
 * lokalize slug'larda sessizce yanlış sonuç verirdi). Hash girdileri hiçbir zaman aktif sayılmaz.
 */
export function isActiveNav(link: NavLink, current?: RouteKey): boolean {
  return current !== undefined && link.route === current;
}
