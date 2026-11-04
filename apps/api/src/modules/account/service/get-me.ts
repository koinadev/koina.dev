import { countUnread } from '@koina/db/repositories/notifications';
import { requireMember } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { toMe } from '../../members/utils/mappers';

export async function getMe(c: AppContext): Promise<Response> {
  const member = requireMember(c);
  return c.json(toMe(member, await countUnread(c.get('db'), member.id)));
}
