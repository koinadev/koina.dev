import { isModerator } from '../../../core/auth/guards';
import type { AppContext } from '../../../core/types/env';
import { fail } from '../../../core/utils/errors';
import { uuidParam } from '../../../core/utils/validate';
import { loadLinks } from '../utils/load-links';

/** Tek bağlantı; gizlenmişse yalnız ekleyen ve moderatör görür. */
export async function getLink(c: AppContext): Promise<Response> {
  const [link] = await loadLinks(c, [uuidParam(c.req.param('id')!)]);
  const viewer = c.get('viewer');
  if (!link || (link.hidden && !(viewer && (viewer.handle === link.author.handle || isModerator(viewer))))) fail('NOT_FOUND');
  return c.json(link);
}
