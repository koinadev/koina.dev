import { AUTH_PATHS, type Me } from '@koina/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { api, ApiError, setToken } from './api';

const KEY = 'koina.session';

// Web'de SecureStore yok; tarayıcıda localStorage'a düşer (yalnız geliştirme önizlemesi için).
const store = {
  get: () => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.getItem(KEY) ?? null) : SecureStore.getItemAsync(KEY)),
  set: (v: string) => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.setItem(KEY, v)) : SecureStore.setItemAsync(KEY, v)),
  clear: () => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.removeItem(KEY)) : SecureStore.deleteItemAsync(KEY)),
};

interface SessionState {
  /** `undefined`: saklı oturum henüz okunmadı. */
  user: Me | null | undefined;
  /** Better Auth'un `set-auth-token` başlığındaki belirteçle oturum açar; üye `/v1/me`'den okunur. */
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: Me) => void;
  /** Üyeyi (ve okunmamış bildirim sayısını) yeniden çeker. */
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null | undefined>(undefined);
  // Saklı belirteç okunmadan ekranlar istek atmasın; yoksa ilk akış girişsiz çekilir, alkış/kaydetme boş görünür.
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();

  const clear = useCallback(async () => {
    setToken(null);
    await store.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    (async () => {
      const token = await store.get().catch(() => null);
      setToken(token);
      setReady(true);
      if (!token) return setUser(null);
      try {
        setUser(await api<Me>('GET', '/v1/me'));
      } catch (err) {
        // Belirteç geçersizse ya da hesap askıdaysa temizle; ağ yoksa oturumu koru, sonra yeniden denenir.
        if (err instanceof ApiError && (err.status === 401 || err.code === 'BANNED')) return clear();
        setUser(null);
      }
    })();
  }, [clear]);

  const refresh = useCallback(async () => {
    try {
      setUser(await api<Me>('GET', '/v1/me'));
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.code === 'BANNED')) await clear();
    }
  }, [clear]);

  const signIn = useCallback(
    async (token: string) => {
      setToken(token);
      try {
        const me = await api<Me>('GET', '/v1/me');
        await store.set(token);
        setUser(me);
      } catch (err) {
        setToken(null);
        throw err;
      }
      // Alkış, kaydetme, "ben de geliyorum" gibi kişiye özel alanlar yeniden çekilsin.
      await queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    await api('POST', AUTH_PATHS.signOut, {}).catch(() => undefined);
    await clear();
    queryClient.removeQueries({ queryKey: ['notifications'] });
    queryClient.removeQueries({ queryKey: ['bookmarks'] });
    await queryClient.invalidateQueries();
  }, [queryClient, clear]);

  return <SessionContext value={{ user, signIn, signOut, setUser, refresh }}>{ready ? children : null}</SessionContext>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession SessionProvider içinde kullanılmalı');
  return ctx;
}
