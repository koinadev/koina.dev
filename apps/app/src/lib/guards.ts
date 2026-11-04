import type { Me } from '@koina/shared/api';
import { redirect } from '@tanstack/react-router';
import { ApiError } from './api';

/** Üyelere açık sayfa: misafir girişe gider, girişten sonra buraya döner. Sunucuda da çalışır (SSR'da 307). */
export function requireMe({ context, location }: { context: { me: Me | null }; location: { href: string } }): { me: Me } {
  if (!context.me) throw redirect({ to: '/giris', search: { next: location.href } });
  return { me: context.me };
}

/** Yükleyicide 404'ü yönlendiricinin `notFound`'una çevirmek için. */
export const isMissing = (err: unknown) => err instanceof ApiError && (err.code === 'NOT_FOUND' || err.status === 404);
