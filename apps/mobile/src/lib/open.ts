import type { Target } from '@koina/web/content/types';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import { resolveTarget } from './content';

/** Uygulama içi hedefe gider; dış bağlantıyı uygulama içi tarayıcıda, e-postayı posta uygulamasında açar. */
export function openTarget(target: Target) {
  const dest = resolveTarget(target);
  if (dest.kind === 'app') return router.push(dest.href);
  return openUrl(dest.url);
}

export function openUrl(url: string) {
  if (/^(mailto|tel):/.test(url)) return Linking.openURL(url);
  return WebBrowser.openBrowserAsync(url, { controlsColor: '#3341C4' });
}
