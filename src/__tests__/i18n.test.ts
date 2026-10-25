import { describe, expect, it } from 'vitest';
import { defaultLocale, getLocaleFromUrl, useTranslations, type Locale } from '../i18n/utils';

describe('i18n utils', () => {
  it('url prefix locale tespiti', () => {
    expect(getLocaleFromUrl(new URL('https://x.com/en/blog'))).toBe('en'); // @feature:i18n
    expect(getLocaleFromUrl(new URL('https://x.com/tr/blog'))).toBe('tr');
    // Ön ek taşımayan yollar (kök yönlendirme stub'ı, 404) varsayılan dile düşer.
    expect(getLocaleFromUrl(new URL('https://x.com/'))).toBe('tr');
  });
  it('t() varsayılan dilde çeviri ve fallback', () => {
    const t = useTranslations('tr');
    expect(t('theme.toggle')).toBe('Temayı değiştir');
    expect(t('olmayan.anahtar')).toBe('olmayan.anahtar');
  });
  /* @feature:i18n */
  it('t() ikincil dilde çeviri ve fallback', () => {
    const t = useTranslations('en');
    expect(t('theme.toggle')).toBe('Toggle theme');
    expect(t('olmayan.anahtar')).toBe('olmayan.anahtar');
  });
  /* @/feature:i18n */
  it('varsayılan locale tr', () => {
    expect(defaultLocale).toBe('tr');
  });
  it('Locale tipi tanımsız bir dili KABUL ETMEZ (tip regresyon koruması)', () => {
    // @ts-expect-error — Locale 'tr' | 'en' olmalı; düz `string`e genişlerse bu satır
    // tip hatası üretmez ve `astro check` bu testi kırar.
    const invalid: Locale = 'xx';
    expect(invalid).toBe('xx');
  });
});
