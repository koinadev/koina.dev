import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useRouter } from '@tanstack/react-router';
import { useCallback } from 'react';
import type { Me } from '@koina/shared/api';
import { api } from './api';
import { meQuery } from './queries';

/** Girişli üye ya da `null`. Kök yönlendirici veriyi sunucuda yükler; ilk çizimde hazır gelir. */
export function useMe(): Me | null {
  return useQuery(meQuery).data ?? null;
}

export const isModerator = (me: Me | null) => me?.role === 'moderator' || me?.role === 'admin';

/** Giriş sayfasının adresi; dönüşte kullanıcı kaldığı yere gelsin. */
export const loginHref = (next: string) => `/giris?next=${encodeURIComponent(next)}`;

/** Korumalı eylem: oturum varsa çalıştırır, yoksa girişe gönderir. Düğmeler misafire de görünür. */
export function useRequireAuth() {
  const me = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(
    (action: () => void) => {
      if (me) action();
      else navigate({ to: '/giris', search: { next: location.href } });
    },
    [me, navigate, location.href],
  );
}

export function useSignOut() {
  const qc = useQueryClient();
  const router = useRouter();
  return async () => {
    await api('POST', '/v1/auth/sign-out', {}).catch(() => undefined);
    qc.setQueryData(['me'], null);
    // Kişisel alanlar (alkış, kaydetme, katılım) misafir için yeniden çekilsin.
    await qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    await router.invalidate();
  };
}
