import type { Action } from '../types';
import type { IconName } from '../../lib/icons';

// Bağlantılar sayfası: sosyal medya profillerindeki "bio linki" buraya gelir.
export const links = {
  meta: {
    title: 'Bağlantılar',
    description:
      'Koina’nın tüm bağlantıları: Discord, YouTube, Instagram, X, LinkedIn, GitHub, bülten ve ücretsiz kayıt.',
  },
  title: 'Koina',
  bio: 'Ücretsiz ve imece usulü işleyen açık kaynak topluluğu. Aynı repoda buluşalım.',
  note: 'hepsi burada!',
  groups: [
    {
      title: 'Hemen başla',
      items: [
        {
          icon: 'UserAdd01Icon',
          label: 'Ücretsiz kayıt ol',
          hint: '2 dakika',
          route: 'signup',
          featured: true,
        },
        {
          icon: 'DiscordIcon',
          label: 'Discord’a katıl',
          hint: 'sohbet, soru-cevap, Cuma kahvesi',
          href: 'https://discord.gg/koinadev',
        },
        {
          icon: 'Mail01Icon',
          label: 'Koina Haftası bülteni',
          hint: 'her pazartesi, tek e-posta',
          route: 'home',
          hash: '#newsletter',
        },
      ],
    },
    {
      title: 'Takip et',
      items: [
        {
          icon: 'YoutubeIcon',
          label: 'YouTube',
          hint: 'Salı ve Perşembe 21:00 canlı',
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
          hint: 'tüm projeler açık',
          href: 'https://github.com/koinadev',
        },
      ],
    },
    {
      title: 'Daha fazlası',
      items: [
        { icon: 'Calendar03Icon', label: 'Etkinlikler ve yayınlar', route: 'events' },
        { icon: 'HandshakeIcon', label: 'Destekçi ol', route: 'sponsor' },
        { icon: 'BubbleChatQuestionIcon', label: 'Sık sorulan sorular', route: 'faq' },
        {
          icon: 'Mail01Icon',
          label: 'Bize yaz',
          hint: 'merhaba@koina.dev',
          href: 'mailto:merhaba@koina.dev',
        },
      ],
    },
  ] as { title: string; items: (Action & { icon: IconName; hint?: string; featured?: boolean })[] }[],
};
