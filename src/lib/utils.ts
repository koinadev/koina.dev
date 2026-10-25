import { LOCALES, type Locale } from '../i18n/utils';

export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALES[locale].dateLocale, { dateStyle: 'long' }).format(date);
}

export function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}
