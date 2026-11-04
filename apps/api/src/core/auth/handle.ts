import { isHandleTaken } from '@koina/db/repositories/members';
import type { Queryable } from '@koina/db';

/** Sistem ve marka adları: kimse bu kullanıcı adlarını alamaz. */
export const RESERVED_HANDLES = new Set([
  'admin', 'administrator', 'api', 'app', 'auth', 'help', 'info', 'koina', 'koinadev', 'mod', 'moderator', 'null',
  'root', 'support', 'system', 'undefined', 'www', 'yardim', 'destek',
]);

/** E-postanın yerel kısmından geçerli bir kullanıcı adı adayı: `Ada.Lovelace+x` → `ada-lovelace`. */
export function handleFromEmail(email: string): string {
  const base = email
    .split('@')[0]!
    .split('+')[0]!
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
    .replace(/-+$/, '');
  const candidate = base.length >= 3 ? base : `uye-${base || 'koina'}`.slice(0, 24);
  return RESERVED_HANDLES.has(candidate) ? `${candidate}-uye` : candidate;
}

/** E-postanın yerel kısmından görünen ad: `ada.lovelace` → `Ada Lovelace`. */
export function nameFromEmail(email: string): string {
  const local = email.split('@')[0]!.split('+')[0]!.replace(/[._-]+/g, ' ').trim();
  return local ? local.replace(/(^|\s)\p{L}/gu, (ch) => ch.toLocaleUpperCase('tr')).slice(0, 80) : 'Koina üyesi';
}

/** Boştaki ilk kullanıcı adı: çakışırsa üç haneli sonek denenir. */
export async function uniqueHandle(db: Pick<Queryable, 'query'>, email: string): Promise<string> {
  const base = handleFromEmail(email);
  const none = '00000000-0000-0000-0000-000000000000';
  for (let i = 0; i < 20; i += 1) {
    const handle = i === 0 ? base : `${base.slice(0, 26)}-${Math.floor(Math.random() * 900 + 100)}`;
    if (!(await isHandleTaken(db, handle, none))) return handle;
  }
  return `uye-${crypto.randomUUID().slice(0, 8)}`;
}
