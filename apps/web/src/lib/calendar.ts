// Takvim hesapları ortak pakette (mobil uygulama da kullanıyor); burada yalnızca sitenin
// abonelik adresleri var.
export * from '@koina/shared/calendar';

/** Abonelik dosyalarının adresi; dosyaları `pages/<dil>/` altındaki uç noktalar üretir. */
export const calendarFeeds = {
  tr: '/tr/takvim.ics',
  en: '/en/calendar.ics', // @feature:i18n
} as const;
