import { describe, expect, it } from 'vitest';
import { getMessages } from '../messages';
import { routes, type RouteKey } from '../i18n/routes';
import { locales } from '../i18n/utils';

// Footer sitenin haritası: route registry'deki HER sayfa footer'da bir kez görünmeli. Yeni bir
// sayfa eklenip footer'a konmazsa bu test kırılır.
describe('footer', () => {
  for (const locale of locales) {
    it(`${locale}: her route footer'da tam bir kez yer alır`, () => {
      const { nav } = getMessages(locale);
      const listed = [...nav.footer.community, ...nav.footer.join, ...nav.footer.support, ...nav.legal].map(
        (link) => link.route,
      );
      for (const key of Object.keys(routes) as RouteKey[]) {
        expect(
          listed.filter((r) => r === key),
          key,
        ).toHaveLength(1);
      }
    });
  }
});
