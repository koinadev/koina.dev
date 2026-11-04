import { streamById } from '@koina/shared/schedule';
import { addRsvp, eventExists, removeRsvp } from '@koina/db/repositories/events';
import { requireMember } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { fail } from '../../../core/utils/errors';

/** Katılıyorum / vazgeçtim. Yayın kimlikleri takvimden doğrulanır, diğerleri tablodan. */
export async function rsvp(c: AppContext, going: boolean): Promise<Response> {
  const member = requireMember(c);
  const id = c.req.param('id')!.slice(0, 80);
  const db = c.get('db');
  if (!going) {
    await removeRsvp(db, id, member.id);
    return c.body(null, 204);
  }
  if (!streamById(id) && !(await eventExists(db, id))) fail('NOT_FOUND');
  await addRsvp(db, id, member.id);
  return c.body(null, 204);
}
