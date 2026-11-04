import type { ModQueueItem, ReportReason } from '@koina/shared/api';
import { findMemberById } from '@koina/db/repositories/members';
import { listModerationLog, listReportQueue } from '@koina/db/repositories/moderation';
import { requireModerator } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { loadPosts } from '../../feed/utils/load-posts';
import { loadLinks } from '../../links/utils/load-links';
import { toMemberRef } from '../../members/utils/mappers';

/** Moderatör kuyruğu: çözülmemiş şikâyetler içerik başına, şikâyet edilen içerikle birlikte. */
export async function listQueue(c: AppContext): Promise<Response> {
  requireModerator(c);
  const db = c.get('db');
  const rows = await listReportQueue(db, 100);
  const posts = new Map((await loadPosts(c, rows.filter((r) => r.targetKind === 'post').map((r) => r.targetId))).map((p) => [p.id, p]));
  const links = new Map((await loadLinks(c, rows.filter((r) => r.targetKind === 'link').map((r) => r.targetId))).map((l) => [l.id, l]));
  const items: ModQueueItem[] = [];
  for (const r of rows) {
    const base: ModQueueItem = {
      targetKind: r.targetKind,
      targetId: r.targetId,
      reports: r.reports,
      reasons: r.reasons as ReportReason[],
      firstAt: r.firstAt.toISOString(),
      lastAt: r.lastAt.toISOString(),
    };
    if (r.targetKind === 'post') items.push({ ...base, post: posts.get(r.targetId) });
    else if (r.targetKind === 'link') items.push({ ...base, link: links.get(r.targetId) });
    else {
      const member = await findMemberById(db, r.targetId);
      items.push({ ...base, member: member?.handle ? toMemberRef({ handle: member.handle, name: member.name, roles: member.roles }) : undefined });
    }
  }
  return c.json({ items, next: null });
}

/** Son moderasyon işlemleri (kendiliğinden gizlemeler dahil). */
export async function listLog(c: AppContext): Promise<Response> {
  requireModerator(c);
  const rows = await listModerationLog(c.get('db'), 200);
  return c.json({
    items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    next: null,
  });
}
