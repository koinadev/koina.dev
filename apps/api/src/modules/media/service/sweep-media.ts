import type { Queryable } from '@koina/db';
import { deleteMedia, listOrphanMedia } from '@koina/db/repositories/posts';
import type { Env } from '../../../core/types/env';

/** Saatlik bakım: bir günden eski, hiçbir gönderiye bağlanmamış görseller depodan ve tablodan silinir. */
export async function sweepOrphanMedia(env: Env, db: Pick<Queryable, 'query'>): Promise<number> {
  const orphans = await listOrphanMedia(db, new Date(Date.now() - 86_400_000));
  if (orphans.length === 0) return 0;
  await env.MEDIA.delete(orphans.map((o) => o.key));
  for (const orphan of orphans) await deleteMedia(db, orphan.id);
  return orphans.length;
}
