import { bodyLimit } from 'hono/body-limit';
import { fail } from '../utils/errors';

/** JSON gövdeler küçük kalır; görsel yükleme kendi sınırını taşır (`MEDIA_BYTES`). */
export const jsonBodyLimit = bodyLimit({ maxSize: 64 * 1024, onError: () => fail('PAYLOAD_TOO_LARGE') });
