import { describe, expect, it } from 'vitest';
import { formatDate, readingTime } from '../lib/utils';

describe('utils', () => {
  it('formatDate locale bazlı', () => {
    const date = new Date('2026-08-18');
    expect(formatDate(date, 'tr')).toContain('2026');
    /* @feature:i18n */
    expect(formatDate(date, 'en')).toContain('2026');
    /* @/feature:i18n */
  });
  it('readingTime min 1 dakika', () => {
    expect(readingTime('kısa metin')).toBe(1);
    expect(readingTime(Array(600).fill('kelime').join(' '))).toBe(3);
  });
});
