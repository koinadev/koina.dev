import type { NavLink } from '../../i18n/routes';

// Navigasyon HAM href taşımaz: `route` bir route anahtarı (dile göre lokalize slug'a çözülür),
// `hash` ise ana sayfa içindeki bir bölümdür. Header/Footer `navHref()` ile çözer.
// Marker'lı: JSON olamaz — kaldırılan özelliğe ait linkler burada satır bazında sökülür.
export const nav: { links: NavLink[]; cta: NavLink; legal: NavLink[] } = {
  links: [
    { label: 'Nasıl çalışır', hash: '#nasil' },
    { label: 'Etkinlikler', route: 'events' },
    { label: 'Blog', route: 'blog' }, // @feature:blog
    { label: 'İletişim', route: 'contact' }, // @feature:forms
  ],
  cta: { label: 'Başvur', route: 'join' },
  legal: [{ label: 'Gizlilik', route: 'privacy' }],
};
