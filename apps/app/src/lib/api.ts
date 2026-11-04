import type { ApiErrorCode } from '@koina/shared/api';
import { createIsomorphicFn } from '@tanstack/react-start';

export type ErrorCode = ApiErrorCode | 'NETWORK';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    /** Hata zarfındaki ek alanlar (ör. çakışan bağlantının `id`'si). */
    readonly body: Record<string, unknown> = {},
  ) {
    super(code);
  }
}

/**
 * Tarayıcıda aynı kökteki `/api` vekiline, sunucuda (SSR) doğrudan API'ye gider. Sunucu dalı istemci paketinden derleyici
 * tarafından çıkarılır; Worker'a özgü modüller tarayıcıya hiç inmez.
 */
const send = createIsomorphicFn()
  .server(async (path: string, init: RequestInit) => {
    const { serverApi } = await import('./server/fetch.server');
    return serverApi(path, init);
  })
  .client((path: string, init: RequestInit) => fetch(`/api${path}`, { ...init, credentials: 'same-origin' }));

/** Better Auth hata gövdesi `{ code, message }`; bizimki `{ success: false, code }`. İkisi de `code` taşır. */
function codeOf(data: unknown, status: number): ApiErrorCode {
  const code = (data as { code?: string } | null)?.code;
  if (code === 'INVALID_OTP' || code === 'OTP_EXPIRED' || code === 'TOO_MANY_ATTEMPTS') return 'CODE_INVALID';
  if (code && /^[A-Z_]+$/.test(code)) return code as ApiErrorCode;
  if (status === 429) return 'RATE_LIMITED';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 413) return 'PAYLOAD_TOO_LARGE';
  return 'INTERNAL';
}

export async function request<T>(method: string, path: string, init: { body?: unknown; form?: FormData; headers?: Record<string, string> } = {}): Promise<T> {
  let res: Response;
  try {
    res = await send(path, {
      method,
      headers: {
        accept: 'application/json',
        ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...init.headers,
      },
      body: init.form ?? (init.body === undefined ? undefined : JSON.stringify(init.body)),
    });
  } catch {
    throw new ApiError(0, 'NETWORK');
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) throw new ApiError(res.status, codeOf(data, res.status), data ?? {});
  return data as T;
}

export const api = <T>(method: string, path: string, body?: unknown) => request<T>(method, path, { body });

export const isNotFound = (err: unknown) => err instanceof ApiError && err.code === 'NOT_FOUND';
