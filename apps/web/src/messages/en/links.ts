import type { links as trLinks } from '../tr/links';

export const links: typeof trLinks = {
  meta: {
    title: 'Links',
    description:
      'All Koina links: Discord, YouTube, Instagram, X, LinkedIn, GitHub, the newsletter and signup.',
  },
  title: 'koina.dev',
  bio: 'An imece-style community supporting open source. Meet in the same repo.',
  note: 'all in one place!',
  groups: [
    {
      title: 'Start now',
      items: [
        {
          icon: 'UserAdd01Icon',
          label: 'Sign up',
          hint: '2 minutes',
          route: 'signup',
          featured: true,
        },
        {
          icon: 'DiscordIcon',
          label: 'Join Discord',
          hint: 'chat, Q&A, pairing',
          href: 'https://discord.gg/koinadev',
        },
        {
          icon: 'Mail01Icon',
          label: 'Koina Weekly newsletter',
          hint: 'every Monday, one email',
          route: 'home',
          hash: '#newsletter',
        },
      ],
    },
    {
      title: 'Follow',
      items: [
        {
          icon: 'YoutubeIcon',
          label: 'YouTube',
          hint: 'live every Saturday 20:00 (UTC+3)',
          href: 'https://www.youtube.com/@koinadev',
        },
        {
          icon: 'InstagramIcon',
          label: 'Instagram',
          hint: '@koinadev',
          href: 'https://www.instagram.com/koinadev',
        },
        { icon: 'NewTwitterIcon', label: 'X', hint: '@koinadev', href: 'https://x.com/koinadev' },
        {
          icon: 'Linkedin01Icon',
          label: 'LinkedIn',
          hint: 'Koina',
          href: 'https://www.linkedin.com/company/koinadev',
        },
        {
          icon: 'GithubIcon',
          label: 'GitHub',
          hint: 'every project is open',
          href: 'https://github.com/koinadev',
        },
      ],
    },
    {
      title: 'More',
      items: [
        { icon: 'Calendar03Icon', label: 'Events and streams', route: 'events' },
        { icon: 'HandshakeIcon', label: 'Become a supporter', route: 'sponsor' },
        { icon: 'BubbleChatQuestionIcon', label: 'FAQ', route: 'faq' },
        {
          icon: 'Mail01Icon',
          label: 'Write to us',
          hint: 'info@koina.dev',
          href: 'mailto:info@koina.dev',
        },
      ],
    },
  ],
};
