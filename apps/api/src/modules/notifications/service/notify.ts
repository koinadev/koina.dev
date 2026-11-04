import { insertNotification, type NotificationKindRow } from '@koina/db/repositories/notifications';
import type { AppContext } from '../../../core/types/env';
import { newId } from '../../../core/utils/crypto';

/** Üyeye bildirim bırakır; kendi eylemi için bildirim yok. Aynı kişi aynı içerik için aynı türde ikinci kez bildirim üretmez. */
export async function notify(
  c: AppContext,
  n: { userId: string; actorId: string; kind: NotificationKindRow; postId?: string | null },
): Promise<void> {
  if (n.userId === n.actorId) return;
  await insertNotification(c.get('db'), { id: newId(), userId: n.userId, actorId: n.actorId, kind: n.kind, postId: n.postId ?? null });
}
