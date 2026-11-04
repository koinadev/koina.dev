import type { ApiErrorCode } from '@koina/shared/api';
import { API_URL } from './config';

export type ErrorCode = ApiErrorCode | 'NETWORK';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    /** Zarftaki ek alanlar (ör. `CONFLICT` için var olan kaydın `id`'si). */
    readonly extra: Record<string, unknown> = {},
  ) {
    super(code);
  }
}

let token: string | null = null;
/** Oturum sağlayıcısı belirteci buraya yazar; her istek onu taşır. */
export function setToken(next: string | null) {
  token = next;
}

/**
 * Better Auth hataları `{ code, message }` biçiminde ve kendi kodlarıyla gelir; uygulama yalnız sözleşmedeki kodları
 * çevirdiği için burada eşlenir. Kod denemesi hatalarının hepsi "kod geçersiz" sayılır.
 */
function toCode(status: number, raw: unknown): ErrorCode {
  const code = typeof raw === 'string' ? raw : '';
  if (status === 429) return 'RATE_LIMITED';
  if (code === 'BANNED') return 'BANNED';
  if (/OTP|TOO_MANY_ATTEMPTS/.test(code)) return 'CODE_INVALID';
  if (status === 413) return 'PAYLOAD_TOO_LARGE';
  return (code as ApiErrorCode) || (status === 401 ? 'UNAUTHORIZED' : status === 404 ? 'NOT_FOUND' : 'INTERNAL');
}

async function request(method: string, path: string, body?: unknown): Promise<Response> {
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      // Oturum çerezi değil Bearer belirteci kullanılır; sistemin sakladığı çerez isteğe karışmasın.
      credentials: 'omit',
      headers: {
        accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK');
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as ({ code?: string } & Record<string, unknown>) | null;
  if (!res.ok) throw new ApiError(res.status, toCode(res.status, data?.code), data ?? {});
  return data as T;
}

export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  return parse<T>(await request(method, path, body));
}

/** Yanıt başlıklarıyla birlikte: girişte belirteç `set-auth-token` başlığında gelir. */
export async function apiWithHeaders<T>(method: string, path: string, body?: unknown): Promise<{ data: T; headers: Headers }> {
  const res = await request(method, path, body);
  return { data: await parse<T>(res), headers: res.headers };
}

/**
 * Çok parçalı yükleme. Expo'nun `fetch`'i React Native'in `{ uri, name, type }` dosya parçasını taşımıyor
 * ("Unsupported FormDataPart"); `XMLHttpRequest` dosyayı diskten kendisi okuyup gönderiyor.
 */
export function upload<T>(path: string, form: FormData): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}`);
    xhr.setRequestHeader('accept', 'application/json');
    if (token) xhr.setRequestHeader('authorization', `Bearer ${token}`);
    xhr.onerror = () => reject(new ApiError(0, 'NETWORK'));
    xhr.onload = () => {
      let data: ({ code?: string } & Record<string, unknown>) | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
      else reject(new ApiError(xhr.status, toCode(xhr.status, data?.code), data ?? {}));
    };
    xhr.send(form);
  });
}
