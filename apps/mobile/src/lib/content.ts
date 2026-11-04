import { getMessages } from '@koina/web/content';
import type { Target } from '@koina/web/content/types';
import { routePath, type RouteKey } from '@koina/web/routes';
import type { Href } from 'expo-router';
import { SITE_URL } from './config';
import { locale } from './i18n';

// Site ile aynı içerik: sayfalar, SSS, bağlantılar tek kaynaktan (apps/web/src/messages).
export const content = getMessages(locale);
export type InfoPageKey = keyof typeof content.pages;

// `require` Metro'da varlık kimliği (sayı) döner.
export const photos: Record<string, number> = {
  hero: require('@koina/web/photos/hero.jpg'),
  pairing: require('@koina/web/photos/pairing.jpg'),
  team: require('@koina/web/photos/team.jpg'),
  stream: require('@koina/web/photos/stream.jpg'),
  demo: require('@koina/web/photos/demo.jpg'),
  cowork: require('@koina/web/photos/cowork.jpg'),
  hands: require('@koina/web/photos/hands.jpg'),
  circle: require('@koina/web/photos/circle.jpg'),
  hackathon: require('@koina/web/photos/hackathon.jpg'),
  table: require('@koina/web/photos/table.jpg'),
  highfive: require('@koina/web/photos/highfive.jpg'),
  talk: require('@koina/web/photos/talk.jpg'),
  selfie: require('@koina/web/photos/selfie.jpg'),
};

export type Destination = { kind: 'app'; href: Href } | { kind: 'web'; url: string };

/** Sitedeki bağlantı hedefini uygulamada karşılığı olan ekrana, yoksa web sayfasına çevirir. */
export function resolveTarget(target: Target): Destination {
  if ('href' in target) return { kind: 'web', url: target.href };
  const key: RouteKey = target.route;
  if (key in content.pages) return { kind: 'app', href: { pathname: '/page/[key]', params: { key } } };
  if (key === 'events') return { kind: 'app', href: '/events' };
  if (key === 'links') return { kind: 'app', href: '/explore' };
  if (key === 'signup') return { kind: 'app', href: '/login' };
  return { kind: 'web', url: `${SITE_URL}${routePath(key, locale)}${target.hash ?? ''}` };
}
