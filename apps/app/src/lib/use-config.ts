import { useRouteContext } from '@tanstack/react-router';
import type { AppConfig } from './config';

/** Kök yönlendiricinin yüklediği ortam yapılandırması (APP_URL, site adresi, Turnstile anahtarı). */
export function useConfig(): AppConfig {
  return useRouteContext({ from: '__root__', select: (c) => c.config });
}
