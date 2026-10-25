import type { NavLink } from '../../i18n/routes';

// Marker'lı: JSON olamaz — kaldırılan özelliğe ait linkler burada satır bazında sökülür.
export const nav: { links: NavLink[]; cta: NavLink; legal: NavLink[] } = {
  links: [
    { label: 'How it works', hash: '#how' },
    { label: 'Events', route: 'events' },
    { label: 'Blog', route: 'blog' }, // @feature:blog
    { label: 'Contact', route: 'contact' }, // @feature:forms
  ],
  cta: { label: 'Apply', route: 'join' },
  legal: [{ label: 'Privacy', route: 'privacy' }],
};
