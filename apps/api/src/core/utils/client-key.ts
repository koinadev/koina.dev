import type { AppContext } from '../types/env';
import { sha256 } from './crypto';

/**
 * İstemciyi tanımlayan özet: IP ham hâliyle hiçbir tabloya yazılmaz. Tuz her gün değişir, dolayısıyla dünkü özet bugünkünden
 * çıkarılamaz. IP yalnız Cloudflare'in başlığından okunur; `x-forwarded-for` istemcinin elindedir.
 */
export async function clientKey(c: AppContext): Promise<string> {
  const ip = c.req.header('cf-connecting-ip') ?? 'local';
  const day = new Date().toISOString().slice(0, 10);
  return (await sha256(`${c.env.HASH_SALT ?? ''}:${day}:${ip}`)).slice(0, 32);
}
