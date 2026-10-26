import type { nav as trNav } from '../tr/nav';

export const nav: typeof trNav = {
  links: [
    { label: 'About', route: 'about' },
    { label: 'How it works', route: 'howItWorks' },
    { label: 'Events', route: 'events' },
    { label: 'Sponsorship', route: 'sponsor' },
    { label: 'FAQ', route: 'faq' },
  ],
  cta: { label: 'Join for free', route: 'signup' },
  legal: [{ label: 'Privacy', route: 'privacy' }],
  footer: {
    community: [
      { label: 'Home', route: 'home' },
      { label: 'About us', route: 'about' },
      { label: 'Why we exist', route: 'why' },
      { label: 'Manifesto', route: 'manifesto' },
      { label: 'Free and imece', route: 'imece' },
      { label: 'Code of conduct', route: 'conduct' },
      { label: 'Blog', route: 'blog' }, // @feature:blog
    ],
    join: [
      { label: 'Sign up for free', route: 'signup' },
      { label: 'How it works', route: 'howItWorks' },
      { label: 'For beginners', route: 'learners' },
      { label: 'For mentors', route: 'mentors' },
      { label: 'For idea owners', route: 'founders' },
      { label: 'Projects', route: 'projects' },
    ],
    support: [
      { label: 'Events', route: 'events' },
      { label: 'Live streams', route: 'streams' },
      { label: 'Sponsorship', route: 'sponsor' },
      { label: 'FAQ', route: 'faq' },
      { label: 'License policy', route: 'licensing' },
      { label: 'Links', route: 'links' },
      { label: 'Contact', route: 'contact' }, // @feature:forms
    ],
  },
};
