import type { modActionInput } from '@koina/shared/api';
import type { z } from 'zod';
import {
  banMember,
  deleteMemberSessions,
  findMemberById,
  hideMemberLinks,
  hideMemberPosts,
  restoreMemberLinks,
  restoreMemberPosts,
  unbanMember,
} from '@koina/db/repositories/members';
import { setLinkStatus } from '@koina/db/repositories/links';
import { insertModerationLog, resolveReports } from '@koina/db/repositories/moderation';
import { setPostStatus } from '@koina/db/repositories/posts';
import type { Queryable } from '@koina/db';
import { requireModerator } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { newId } from '../../../core/utils/crypto';
import { fail } from '../../../core/utils/errors';

type Input = z.output<typeof modActionInput>;
type Tx = Pick<Queryable, 'query'>;

const STATUS = { hide: 'hidden', restore: 'visible', remove: 'removed' } as const;

async function contentAction(tx: Tx, input: Input): Promise<boolean> {
  if (input.action === 'dismiss') return true;
  if (!(input.action in STATUS)) fail('INVALID_INPUT');
  const status = STATUS[input.action as keyof typeof STATUS];
  return input.targetKind === 'post' ? setPostStatus(tx, input.targetId, status) : setLinkStatus(tx, input.targetId, status);
}

/** Uzaklaştırma: oturumlar silinir, içerik gizlenir, yeniden giriş açılmaz. Geri alma içeriği yeniden görünür yapar. */
async function memberAction(tx: Tx, input: Input): Promise<boolean> {
  const member = await findMemberById(tx, input.targetId);
  if (!member) return false;
  // Yöneticiyi moderatör uzaklaştıramaz; yetki el değiştirmesin.
  if (member.role === 'admin') fail('FORBIDDEN');
  if (input.action === 'ban') {
    await banMember(tx, member.id);
    await deleteMemberSessions(tx, member.id);
    await hideMemberPosts(tx, member.id);
    await hideMemberLinks(tx, member.id);
    return true;
  }
  if (input.action === 'unban') {
    await unbanMember(tx, member.id);
    await restoreMemberPosts(tx, member.id);
    await restoreMemberLinks(tx, member.id);
    return true;
  }
  if (input.action === 'dismiss') return true;
  fail('INVALID_INPUT');
}

/** Moderatör işlemi: içerik gizle/aç/kaldır ya da üyeyi uzaklaştır; şikâyetler çözülür, işlem kayda geçer. Hepsi tek transaction. */
export async function applyAction(c: AppContext, input: Input): Promise<Response> {
  const moderator = requireModerator(c);
  const applied = await c.get('db').transaction(async (tx) => {
    const ok = input.targetKind === 'user' ? await memberAction(tx, input) : await contentAction(tx, input);
    if (!ok) return false;
    await resolveReports(tx, input.targetKind, input.targetId, input.action);
    await insertModerationLog(tx, {
      id: newId(),
      actorId: moderator.id,
      targetKind: input.targetKind,
      targetId: input.targetId,
      action: input.action,
      reason: input.reason,
    });
    return true;
  });
  if (!applied) fail('NOT_FOUND');
  return c.body(null, 204);
}
