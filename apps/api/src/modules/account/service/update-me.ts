import type { updateProfile } from '@koina/shared/api';
import type { z } from 'zod';
import { isHandleTaken, updateMember } from '@koina/db/repositories/members';
import { RESERVED_HANDLES } from '../../../core/auth/handle';
import { requireMember } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { fail } from '../../../core/utils/errors';
import { rateLimit } from '../../../core/utils/rate-limit';
import { assertCleanText } from '../../moderation/service/screen-content';
import { toMe } from '../../members/utils/mappers';
import { countUnread } from '@koina/db/repositories/notifications';

/** Profili günceller: verilmeyen alan olduğu gibi kalır, `null` siler. Kullanıcı adı tekil ve ayrılmış adlar dışında olmalı. */
export async function updateMe(c: AppContext, input: z.output<typeof updateProfile>): Promise<Response> {
  const member = requireMember(c);
  await rateLimit(c, 'profile', 30, 3600, member.id);
  assertCleanText(input.name, input.handle, input.bio, input.location, ...(input.interests ?? []));
  const db = c.get('db');
  const handle = input.handle ?? member.handle ?? '';
  if (handle !== member.handle) {
    if (RESERVED_HANDLES.has(handle) || (await isHandleTaken(db, handle, member.id))) fail('CONFLICT');
  }
  const row = await updateMember(db, member.id, {
    name: input.name ?? member.name,
    handle,
    bio: input.bio ?? member.bio,
    roles: input.roles ?? member.roles,
    interests: input.interests ?? member.interests,
    github: input.github === undefined ? member.github : input.github,
    website: input.website === undefined ? member.website : input.website,
    location: input.location === undefined ? member.location : input.location,
  });
  return c.json(toMe(row!, await countUnread(db, member.id)));
}
