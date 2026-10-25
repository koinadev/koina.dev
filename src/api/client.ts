/**
 * Tarayıcı-taraflı API istemcisi. Şablon sunucusuz (static-only) çalıştığı için her endpoint
 * custom Worker'a veya üçüncü-taraf bir servise (Formspark, Web3Forms, vb.) delege edilir;
 * istemci bu çağrıları tek
 * bir sözleşmeyle toplar.
 *
 * - `api.get<T>(url, init?)` — JSON ise parse edilir, değilse metin döner.
 * - `api.post<T>(url, body, init?)` — body `FormData` ise olduğu gibi gönderilir (tarayıcı
 *   multipart boundary ekler); aksi halde `JSON.stringify` + `Content-Type: application/json`.
 *
 * Tümü 2xx dışı yanıtta `ApiError` fırlatır (`status`, `.body` ayrıştırılmış yanıt, `.url`).
 * Domain-özel çağrılar (contact, newsletter) `src/api/services/` altında bu istemciyi sarar.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly url: string;

  constructor(status: number, body: unknown, url: string, message?: string) {
    super(message ?? `Request to ${url} failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

type JsonInit = Omit<RequestInit, 'body' | 'method'>;

async function parseResponse<T>(res: Response, url: string): Promise<T> {
  if (!res.ok) {
    // Yanıt gövdesini parse etmeyi best-effort dene: JSON değilse ham metin olarak bırak.
    // Tüketici `ApiError.body`'i okuyarak detay gösterir; hiç parse edilmezse yalnızca status
    // üzerinden mesaj üretmek zorunda kalır.
    let body: unknown = null;
    const text = await res.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    throw new ApiError(res.status, body, url);
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  // JSON DEĞİL: metin olarak döndür. Generic <T> ile uyumlu kalması için unknown köprüsü.
  return (await res.text()) as unknown as T;
}

export const api = {
  async get<T>(url: string, init?: JsonInit): Promise<T> {
    const res = await fetch(url, { ...init, method: 'GET' });
    return parseResponse<T>(res, url);
  },

  async post<T>(url: string, body: unknown, init?: JsonInit): Promise<T> {
    const isFormData = body instanceof FormData;
    // FormData için Content-Type ELLE YAZILMAZ: tarayıcı boundary ile birlikte ekler; aksi
    // halde sunucu multipart'ı çözemez. JSON için ise başlık KONMALI: aksi halde bazı
    // endpoint'ler metin olarak yorumlar.
    // `Accept: application/json` da GÖNDERİLİR: bazı form servisleri (Formspark, Formspree)
    // bu başlık yokken AJAX çağrısına HTML "teşekkürler" sayfasıyla ya da 302 ile yanıt verir;
    // yalnızca `Content-Type` yeterli değildir.
    const res = await fetch(url, {
      ...init,
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
      headers: isFormData
        ? init?.headers
        : { 'Content-Type': 'application/json', Accept: 'application/json', ...init?.headers },
    });
    return parseResponse<T>(res, url);
  },
};
