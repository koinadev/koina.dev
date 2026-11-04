import type { NavLink } from '../../i18n/routes';

// Navigasyon HAM href taşımaz: `route` bir route anahtarı (dile göre lokalize slug'a çözülür),
// `hash` ise ana sayfa içindeki bir bölümdür. Header/Footer `navHref()` ile çözer.
// Marker'lı: JSON olamaz — kaldırılan özelliğe ait linkler burada satır bazında sökülür.
export const nav: {
  links: NavLink[];
  cta: NavLink;
  legal: NavLink[];
  footer: { community: NavLink[]; join: NavLink[]; support: NavLink[] };
} = {
  links: [
    { label: 'Hakkımızda', route: 'about' },
    { label: 'Nasıl çalışır', route: 'howItWorks' },
    { label: 'Etkinlikler', route: 'events' },
    { label: 'SSS', route: 'faq' },
  ],
  cta: { label: 'Aramıza katıl', route: 'signup' },
  legal: [{ label: 'Gizlilik', route: 'privacy' }],
  footer: {
    community: [
      { label: 'Ana sayfa', route: 'home' },
      { label: 'Hakkımızda', route: 'about' },
      { label: 'Neden kurulduk?', route: 'why' },
      { label: 'Manifesto', route: 'manifesto' },
      { label: 'İmece usulü', route: 'imece' },
      { label: 'Davranış kuralları', route: 'conduct' },
      { label: 'Blog', route: 'blog' }, // @feature:blog
    ],
    join: [
      { label: 'Kayıt ol', route: 'signup' },
      { label: 'Nasıl çalışır?', route: 'howItWorks' },
      { label: 'Yeni başlayanlar için', route: 'learners' },
      { label: 'Ustalar için', route: 'mentors' },
      { label: 'Fikir sahipleri için', route: 'founders' },
      { label: 'Projeler', route: 'projects' },
    ],
    support: [
      { label: 'Etkinlikler', route: 'events' },
      { label: 'Canlı yayınlar', route: 'streams' },
      { label: 'Sponsorluk', route: 'sponsor' },
      { label: 'Sık sorulan sorular', route: 'faq' },
      { label: 'Lisans politikası', route: 'licensing' },
      { label: 'Bağlantılar', route: 'links' },
      { label: 'İletişim', route: 'contact' }, // @feature:forms
    ],
  },
};
