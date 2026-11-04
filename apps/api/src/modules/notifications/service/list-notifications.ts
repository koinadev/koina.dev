import type { Notification, Page } from '@koina/shared/api';
import { listNotifications as listRows, markAllRead } from '@koina/db/repositories/notifications';
import { requireMember } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { timeCursor } from '../../../core/utils/cursor';
import { toMemberRef } from '../../members/utils/mappers';

const PAGE = 30;
const SNIPPET = 140;

export async function listNotifications(c: AppContext): Promise<Response> {
  const member = requireMember(c);
  const rows = await listRows(c.get('db'), member.id, timeCursor(c.req.query('cursor')), PAGE + 1);
  const items: Notification[] = rows.slice(0, PAGE).map((r) => ({
    id: r.id,
    kind: r.kind,
    actor: toMemberRef({ handle: r.actorHandle, name: r.actorName, roles: r.actorRoles }),
    post: r.postId ? { id: r.postId, body: (r.postBody ?? '').slice(0, SNIPPET) } : null,
    createdAt: r.createdAt.toISOString(),
    read: r.readAt !== null,
  }));
  const page: Page<Notification> = { items, next: rows.length > PAGE ? rows[PAGE - 1]!.createdAt.toISOString() : null };
  return c.json(page);
}

export async function readNotifications(c: AppContext): Promise<Response> {
  const member = requireMember(c);
  await markAllRead(c.get('db'), member.id);
  return c.body(null, 204);
}
