import { eventKinds, memberRoles } from '@koina/shared/api';
import { z } from 'zod';
import { deleteEvent, insertEvent } from '@koina/db/repositories/events';
import { findMemberByHandle, setMemberRole } from '@koina/db/repositories/members';
import { listDailyHits, listEventHits, listPageHits, listReferrerHits, listSubmissions, listSubscribers } from '@koina/db/repositories/site';
import type { AppContext } from '../../../core/types/env';
import { newId } from '../../../core/utils/crypto';
import { fail } from '../../../core/utils/errors';

/** Son N günün sayfa görüntülemeleri, olayları ve yönlendirenleri. */
export async function analyticsSummary(c: AppContext): Promise<Response> {
  const days = Math.min(Number(c.req.query('days') ?? 30) || 30, 365);
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const db = c.get('db');
  const [daily, pages, events, referrers] = await Promise.all([
    listDailyHits(db, since),
    listPageHits(db, since),
    listEventHits(db, since),
    listReferrerHits(db, since),
  ]);
  return c.json({ since, daily, pages, events, referrers });
}

export async function submissions(c: AppContext): Promise<Response> {
  return c.json({ items: await listSubmissions(c.get('db'), c.req.query('form') || null) });
}

export async function subscribers(c: AppContext): Promise<Response> {
  return c.json({ items: await listSubscribers(c.get('db')) });
}

export const newEvent = z.object({
  kind: z.enum(eventKinds),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).default(''),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  url: z.url().nullable().default(null),
});

export async function addEvent(c: AppContext, e: z.output<typeof newEvent>): Promise<Response> {
  const id = newId();
  await insertEvent(c.get('db'), { id, ...e });
  return c.json({ id }, 201);
}

export async function removeEvent(c: AppContext): Promise<Response> {
  await deleteEvent(c.get('db'), c.req.param('id')!);
  return c.body(null, 204);
}

export const roleInput = z.object({ role: z.enum(memberRoles) });

/** Moderatör atama: yalnız yönetici belirteciyle. Moderatör en az güvenilir (2) sayılır. */
export async function assignRole(c: AppContext, { role }: z.output<typeof roleInput>): Promise<Response> {
  const db = c.get('db');
  const member = await findMemberByHandle(db, c.req.param('handle')!);
  if (!member) fail('NOT_FOUND');
  await setMemberRole(db, member.id, role, role === 'member' ? 0 : 2);
  return c.body(null, 204);
}
