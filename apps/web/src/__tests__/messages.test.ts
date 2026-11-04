import { describe, expect, it } from 'vitest';
import { getMessages } from '../messages';

describe('getMessages', () => {
  it('tr bundle döner', () => {
    expect(getMessages('tr').nav.links.length).toBeGreaterThan(0);
  });
  /* @feature:i18n */
  it('en bundle tr ile aynı yapıdadır', () => {
    expect(Object.keys(getMessages('en').nav)).toEqual(Object.keys(getMessages('tr').nav));
  });
  /* @/feature:i18n */
  // Eski `locale: string` sözleşmesinde 'xx' gibi geçersiz bir kod tr'ye düşüyordu.
  // Yeni sözleşme `locale: Locale`: bilinmeyen kodlar zaten tip sistemi tarafından
  // engelleniyor; buradaki davranışsal test anlamını yitirdi, kaldırıldı. Eşdeğer tip
  // güvenliği i18n.test.ts'te "Locale tipi tanımsız bir dili KABUL ETMEZ" ile korunuyor.
});
