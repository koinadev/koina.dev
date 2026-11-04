import { fail } from '../../../core/utils/errors';
import { screenText } from '../domain/content-filter';

/** Kullanıcı metinlerini (gönderi, profil, proje, bağlantı) süzer; aykırıysa `CONTENT_REJECTED`. Boş değerler atlanır. */
export function assertCleanText(...texts: (string | null | undefined)[]): void {
  for (const text of texts) {
    if (text && !screenText(text).ok) fail('CONTENT_REJECTED');
  }
}
