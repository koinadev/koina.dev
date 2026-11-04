import type { ApiErrorCode } from '@koina/shared/api';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

const status: Record<ApiErrorCode, ContentfulStatusCode> = {
  INVALID_INPUT: 400,
  INVALID_SUBMISSION: 400,
  TURNSTILE_FAILED: 400,
  CODE_INVALID: 400,
  CONTENT_REJECTED: 422,
  DUPLICATE: 422,
  TOO_MANY_LINKS: 422,
  MEDIA_INVALID: 415,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  FEATURE_LOCKED: 403,
  BANNED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  MAIL_UNAVAILABLE: 503,
};

/** Sözleşmedeki hata zarfıyla (`{ success: false, code }`) biten istisna. `extra` zarfa eklenir (ör. çakışan kaydın kimliği). */
export function fail(code: ApiErrorCode, extra?: Record<string, string>): never {
  throw new HTTPException(status[code], {
    res: Response.json({ success: false, code, ...extra }, { status: status[code] }),
  });
}
