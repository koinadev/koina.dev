import type { FormName, formSubmission } from '@koina/shared/api';
import type { z } from 'zod';
import { insertSubmission } from '@koina/db/repositories/site';
import type { AppContext } from '../../../core/types/env';
import { newId } from '../../../core/utils/crypto';
import { fail } from '../../../core/utils/errors';
import { notifyTeam } from '../../../core/utils/mail';
import { rateLimit } from '../../../core/utils/rate-limit';
import { verifyTurnstile } from '../../../core/utils/turnstile';

/** Sitenin iletişim ve kayıt formları: bal küpü, hız sınırı, Turnstile (sır yoksa form kapalı). */
export async function submitForm(c: AppContext, form: FormName, input: z.output<typeof formSubmission>): Promise<Response> {
  if (input.website) fail('INVALID_SUBMISSION');
  await rateLimit(c, `form:${form}`, 5, 600);
  const verified = await verifyTurnstile(c.env, input['cf-turnstile-response'], c.req.header('cf-connecting-ip'));
  if (verified === null) fail('INTERNAL');
  if (!verified) fail('TURNSTILE_FAILED');
  await insertSubmission(c.get('db'), { id: newId(), form, name: input.name, email: input.email, message: input.message });
  c.get('defer')(notifyTeam(c.env, `📬 Yeni ${form === 'signup' ? 'kayıt' : 'mesaj'}: **${input.name}**\n${input.message}`));
  return c.json({ success: true });
}
