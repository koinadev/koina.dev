import { deleteMember, listMemberMediaKeys } from '@koina/db/repositories/members';
import { requireMember } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';

/**
 * Hesabı ve tüm verisini siler (KVKK: unutulma hakkı): gönderiler, yanıtlar, sahibi olduğu projeler, bağlantılar, oylar, oturumlar
 * yabancı anahtarla birlikte gider. Görseller depodan yanıttan sonra kalkar. Uzaklaştırılmış üye de hesabını silebilir.
 */
export async function deleteMe(c: AppContext): Promise<Response> {
  const viewer = c.get('viewer');
  const member = viewer?.bannedAt ? viewer : requireMember(c);
  const db = c.get('db');
  const keys = (await listMemberMediaKeys(db, member.id)).map((r) => r.key);
  await deleteMember(db, member.id);
  for (let i = 0; i < keys.length; i += 1000) c.get('defer')(c.env.MEDIA.delete(keys.slice(i, i + 1000)));
  return c.body(null, 204);
}
