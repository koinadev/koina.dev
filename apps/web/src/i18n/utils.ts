import tr from '../messages/tr/common.json';
import en from '../messages/en/common.json'; // @feature:i18n

// `Record<string, ...>` anotasyonu EKLENMEZ: `keyof typeof translations` `string`e genişler ve
// `Locale` tip güvenliğini kaybeder (geçersiz bir locale sessizce kabul edilir).
const translations = {
  tr,
  en, // @feature:i18n
};

export type Locale = keyof typeof translations;
export const defaultLocale: Locale = 'tr';
export const locales = Object.keys(translations) as Locale[];

// Prefixli routing (`/tr/...`, `/en/...`) sayesinde her içerik sayfası dilini yolunda taşır.
// Ön ek taşımayan yollar (kök yönlendirme stub'ı, `/404`) varsayılan dile düşer.
export function getLocaleFromUrl(url: URL): Locale {
  const [, first] = url.pathname.split('/');
  return first && first in translations ? (first as Locale) : defaultLocale;
}

// `LOCALES` bir dilin HTML özniteliklerini ve Intl biçimlendirme kodunu taşır; bileşenler
// hartadan kodlanmış `<html lang="...">` yazmak yerine buradan okur.
//
// 3. dil eklemek: (1) buraya `de: { label, htmlLang, dir, dateLocale, numberLocale }` ekle,
// (2) `translations`a `de` importunu ekle, (3) `src/messages/index.ts`e `de` bundle'ını ekle.
// `Locale` tipi ve `locales` listesi kendiliğinden genişler.
export interface LocaleMeta {
  readonly label: string;
  readonly htmlLang: string;
  readonly dir: 'ltr' | 'rtl';
  /** `Intl.DateTimeFormat` ve diğer Intl API'leri için BCP 47 kodu. */
  readonly dateLocale: string;
  /** `Intl.NumberFormat` için BCP 47 kodu. */
  readonly numberLocale: string;
}

export const LOCALES = {
  tr: { label: 'Türkçe', htmlLang: 'tr-TR', dir: 'ltr', dateLocale: 'tr-TR', numberLocale: 'tr-TR' },
  en: { label: 'English', htmlLang: 'en-US', dir: 'ltr', dateLocale: 'en-US', numberLocale: 'en-US' }, // @feature:i18n
} as const satisfies Record<Locale, LocaleMeta>;

export function getLocaleMeta(locale: Locale): LocaleMeta {
  return LOCALES[locale];
}

function lookup(dict: object, key: string): unknown {
  return key.split('.').reduce<unknown>((obj, k) => (obj as Record<string, unknown> | undefined)?.[k], dict);
}

export function useTranslations(locale: Locale) {
  return function t(key: string): string {
    const value = lookup(translations[locale], key) ?? lookup(translations[defaultLocale], key);
    return typeof value === 'string' ? value : key;
  };
}
