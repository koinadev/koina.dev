// Tek adres, iki Worker: uygulamanın rotaları burada çalışır, gerisi tanıtım sitesine aktarılır. Yeni bir üst düzey rota buraya da
// eklenmeli; front-door.test.ts unutulanı yakalar.
const APP_SEGMENTS = new Set([
  'api',
  '_serverFn',
  'home',
  'akis',
  'ara',
  'baglantilar',
  'bildirimler',
  'etiket',
  'giris',
  'kaydedilenler',
  'kesfet',
  'moderasyon',
  'profil',
  'proje',
  'takvim',
  'u',
  'yazilar',
  'robots.txt',
  'sitemap.xml',
]);

export const isAppPath = (pathname: string): boolean => APP_SEGMENTS.has(pathname.split('/')[1] ?? '');

/** Tanıtım sitesinin ana sayfaları: girişli üye bunları değil uygulamayı görür. */
export const isLanding = (pathname: string): boolean => /^\/(tr|en)?\/?$/.test(pathname);

export const hasSessionCookie = (cookie: string | null): boolean => !!cookie && /(^|;\s*)(__Secure-)?koina\.session_token=/.test(cookie);
