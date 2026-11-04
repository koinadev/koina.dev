import { insertModerationLog } from '@koina/db/repositories/moderation';
import { setPostStatus } from '@koina/db/repositories/posts';
import type { AppContext } from '../../../core/types/env';
import { newId } from '../../../core/utils/crypto';

const MODEL = '@cf/meta/llama-guard-3-8b';

/**
 * İsteğe bağlı ikinci kat: Llama Guard metni güvensiz bulursa gönderi gizlenir ve kayda geçer (moderatör geri açabilir).
 * `AI_MODERATION=on` ve `AI` bağlaması yoksa hiçbir şey yapmaz. Yanıttan sonra çalışır; hata gönderiyi etkilemez.
 */
export async function aiScreenPost(c: AppContext, postId: string, body: string): Promise<void> {
  if (c.env.AI_MODERATION !== 'on' || !c.env.AI || !body.trim()) return;
  const result = (await c.env.AI.run(MODEL as never, { messages: [{ role: 'user', content: body }] } as never)) as { response?: string };
  const verdict = (result.response ?? '').trim().toLowerCase();
  if (!verdict.startsWith('unsafe')) return;
  const db = c.get('db');
  await setPostStatus(db, postId, 'hidden');
  await insertModerationLog(db, {
    id: newId(),
    actorId: null,
    targetKind: 'post',
    targetId: postId,
    action: 'ai-hide',
    reason: verdict.split('\n')[1]?.slice(0, 40) ?? '',
  });
}
