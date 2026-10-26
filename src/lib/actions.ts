import { routePath } from '../i18n/routes';
import type { Locale } from '../i18n/utils';
import type { Action, Target } from '../messages/types';

/** İçerikteki hedefi gerçek adrese çevirir: route anahtarı o dilin slug'ına çözülür. */
export function actionHref(target: Target | Action, locale: Locale): string {
  if ('href' in target) return target.href;
  return `${routePath(target.route, locale)}${target.hash ?? ''}`;
}

export const isExternal = (href: string) => /^(https?:|mailto:)/.test(href);
