import * as tr from './tr';
import * as en from './en'; // @feature:i18n
import type { Locale } from '../i18n/utils';

const bundles: Record<Locale, typeof tr> = {
  tr,
  en, // @feature:i18n
};

// `Locale` zorunlu: çağıran sayfa/bileşen dilini kendisi biliyor olmalı. Bu tasarım bileşenlerin
// "locale atlanırsa 'tr' olsun" kolaycılığına düşmesini engelliyor. Tipler sayesinde `astro check`
// eksik/geçersiz `locale` argümanını derleme zamanında yakalar.
export function getMessages(locale: Locale): typeof tr {
  return bundles[locale];
}
