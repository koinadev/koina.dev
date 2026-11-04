import type { ModTarget, reportInput } from '@koina/shared/api';
import type { z } from 'zod';
import { findMemberByHandle } from '@koina/db/repositories/members';
import { findLinkMeta, setLinkStatus } from '@koina/db/repositories/links';
import { insertModerationLog, insertReport, tallyReports } from '@koina/db/repositories/moderation';
import { findPostMeta, setPostStatus } from '@koina/db/repositories/posts';
import { requireMember } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { newId } from '../../../core/utils/crypto';
import { fail } from '../../../core/utils/errors';
import { notifyTeam } from '../../../core/utils/mail';
import { rateLimit } from '../../../core/utils/rate-limit';
import { uuidParam } from '../../../core/utils/validate';
import { shouldAutoHide } from '../domain/spam-rules';

type Input = z.output<typeof reportInput>;

/** Şikâyet edilen içeriğin kimliği ve sahibi; kendi içeriğini şikâyet etmek anlamsız, yasak. */
async function resolveTarget(c: AppContext, kind: ModTarget): Promise<{ id: string; ownerId: string }> {
  const db = c.get('db');
  if (kind === 'user') {
    const member = await findMemberByHandle(db, c.req.param('handle')!);
    if (!member) fail('NOT_FOUND');
    return { id: member.id, ownerId: member.id };
  }
  const id = uuidParam(c.req.param('id')!);
  const meta = kind === 'post' ? await findPostMeta(db, id) : await findLinkMeta(db, id);
  if (!meta || meta.status === 'removed') fail('NOT_FOUND');
  return { id, ownerId: meta.userId };
}

/**
 * Şikâyet kaydeder; eşik aşılırsa gönderi ya da bağlantı kendiliğinden gizlenir ve moderasyon kaydına düşer. Aynı üyenin ikinci
 * şikâyeti sessizce yok sayılır (yanıt aynı), böylece şikâyetle sayaç şişirilemez.
 */
export async function reportContent(c: AppContext, kind: ModTarget, input: Input): Promise<Response> {
  const member = requireMember(c);
  await rateLimit(c, 'report', 20, 86_400, member.id);
  const target = await resolveTarget(c, kind);
  if (target.ownerId === member.id) fail('FORBIDDEN');
  const db = c.get('db');
  const created = await insertReport(db, { id: newId(), reporterId: member.id, targetKind: kind, targetId: target.id, reason: input.reason, note: input.note });
  if (created && kind !== 'user' && shouldAutoHide(await tallyReports(db, kind, target.id))) {
    const hidden = kind === 'post' ? await setPostStatus(db, target.id, 'hidden') : await setLinkStatus(db, target.id, 'hidden');
    if (hidden) {
      await insertModerationLog(db, { id: newId(), actorId: null, targetKind: kind, targetId: target.id, action: 'auto-hide', reason: input.reason });
      c.get('defer')(notifyTeam(c.env, `🚩 Şikâyet eşiği aşıldı, ${kind} gizlendi: ${target.id}`));
    }
  }
  return c.body(null, 204);
}
