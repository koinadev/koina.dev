// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '../api/client';

// `fetch` global'ini vitest ile mock'luyoruz; jsdom'un fetch'i response constructor için
// yeterli davranışı vermiyor (ör. multipart body kabul etmiyor) — bu yüzden tamamen stub'lıyoruz.
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function okResponse(body: unknown, contentType = 'application/json'): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': contentType },
  });
}

describe('api.get', () => {
  it('GET isteği atar ve JSON yanıtı ayrıştırır', async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ items: [1, 2, 3] }));
    const data = await api.get<{ items: number[] }>('https://example.com/api');
    expect(data).toEqual({ items: [1, 2, 3] });
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/api', { method: 'GET' });
  });

  it('JSON olmayan yanıtı metin olarak döner', async () => {
    fetchMock.mockResolvedValueOnce(okResponse('hello', 'text/plain'));
    const text = await api.get<string>('https://example.com/plain');
    expect(text).toBe('hello');
  });

  it('2xx dışı yanıtta ApiError fırlatır (status, body, url)', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('{"error":"missing"}', { status: 404, headers: { 'content-type': 'application/json' } }),
    );
    try {
      await api.get('https://example.com/missing');
      expect.fail('ApiError fırlaması gerekirdi');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const e = err as ApiError;
      expect(e.status).toBe(404);
      expect(e.url).toBe('https://example.com/missing');
      expect(e.body).toEqual({ error: 'missing' });
    }
  });

  it('JSON olmayan hata gövdesini metin olarak bırakır', async () => {
    fetchMock.mockResolvedValueOnce(new Response('upstream broken', { status: 502 }));
    try {
      await api.get('https://example.com/broken');
      expect.fail('beklenen hata');
    } catch (err) {
      expect((err as ApiError).body).toBe('upstream broken');
    }
  });
});

describe('api.post', () => {
  it('JSON body Content-Type: application/json ile gönderilir', async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ id: 1 }));
    await api.post('https://example.com/items', { name: 'Ada' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.com/items');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'Ada' }));
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('FormData olduğu gibi gönderilir, Content-Type eklenmez', async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ success: true }));
    const fd = new FormData();
    fd.append('name', 'Ada');
    await api.post('https://example.com/submit', fd);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBe(fd);
    // Başlık ya YOKtur ya da çağıranın eklediği başlıktır; "Content-Type" istemci tarafından
    // zorla EKLENMEMELİ — aksi halde tarayıcının multipart boundary'si ezilir.
    const headers = (init.headers ?? {}) as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('Çağıranın eklediği Content-Type korunur (JSON için)', async () => {
    fetchMock.mockResolvedValueOnce(okResponse({}));
    await api.post('https://example.com/api', { x: 1 }, { headers: { 'X-Token': 'abc' } });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json', 'X-Token': 'abc' });
  });

  it('HTMLFormElement üzerinden FormData üretip POST eder (ContactForm regresyon)', async () => {
    // ContactForm.astro `api.post(url, new FormData(form))` çağırır; bu yolun da çalıştığı
    // regresyon kilidi — eski `api.send` kaldırıldı, form gönderimi bu iki satıra düştü.
    fetchMock.mockResolvedValueOnce(okResponse({ success: true }));
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.name = 'email';
    input.value = 'ada@example.com';
    form.appendChild(input);
    await api.post('https://example.com/submit', new FormData(form));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.com/submit');
    expect(init.method).toBe('POST');
    const body = init.body as FormData;
    expect(body.get('email')).toBe('ada@example.com');
  });
});
