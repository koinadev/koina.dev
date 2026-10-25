// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { submitContactForm } from '../api/services/contact.service';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** ContactForm.astro'nun ürettiği markup'ın test karşılığı: endpoint + alanlar + Turnstile. */
function buildForm({
  provider = 'custom',
  endpoint,
  accessKey,
  turnstile = 'tok_valid',
  honeypot = '',
}: {
  provider?: string;
  endpoint?: string;
  accessKey?: string;
  turnstile?: string;
  honeypot?: string;
} = {}): HTMLFormElement {
  const form = document.createElement('form');
  form.dataset.provider = provider;
  if (endpoint !== undefined) form.dataset.endpoint = endpoint;
  if (accessKey !== undefined) form.dataset.accessKey = accessKey;
  for (const [name, value] of [
    ['name', 'Ada'],
    ['email', 'ada@example.com'],
    ['message', 'Merhaba'],
    ['website', honeypot],
  ]) {
    const input = document.createElement('input');
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  if (turnstile !== undefined) {
    // Turnstile widget'ı bu gizli alanı forma KENDİSİ enjekte eder; testte elle taklit ediyoruz.
    const token = document.createElement('input');
    token.type = 'hidden';
    token.name = 'cf-turnstile-response';
    token.value = turnstile;
    form.appendChild(token);
  }
  return form;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('submitContactForm', () => {
  it('custom Worker`a kanonik JSON gövdesi ve güvenlik alanlarıyla POST eder', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, submissionId: 'sub_1' }));
    await submitContactForm(
      buildForm({ provider: 'custom', endpoint: 'https://forms.example.com/v1/forms/nafrucom/contact' }),
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://forms.example.com/v1/forms/nafrucom/contact');
    expect(init.method).toBe('POST');
    // Formspark AJAX sözleşmesi ikisini de ister; Accept düşerse HTML sayfa döner.
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
    expect(JSON.parse(init.body)).toEqual({
      name: 'Ada',
      email: 'ada@example.com',
      message: 'Merhaba',
      website: '',
      'cf-turnstile-response': 'tok_valid',
    });
  });

  it('Turnstile token`ını gövdeye `cf-turnstile-response` olarak taşır', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, submissionId: 'sub_2' }));
    await submitContactForm(
      buildForm({
        provider: 'custom',
        endpoint: 'https://forms.example.com/v1/forms/nafrucom/contact',
        turnstile: 'tok_xyz',
      }),
    );

    // REGRESYON KİLİDİ: servis sunucu tarafında bu alanı doğruluyor. Gövdeden düşerse form
    // "captcha`sız" gönderilir ve koruma sessizce devre dışı kalır.
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)['cf-turnstile-response']).toBe('tok_xyz');
  });

  it('Formspark 2xx yanıtta gövde şekline bakmadan başarılı olur ve honeypot`u `_gotcha` olarak yollar', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'sub_3', form: 'abc123' }));
    await expect(
      submitContactForm(
        buildForm({ provider: 'formspark', endpoint: 'https://submit-form.com/abc123', honeypot: '' }),
      ),
    ).resolves.toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      name: 'Ada',
      email: 'ada@example.com',
      message: 'Merhaba',
      _gotcha: '',
      'cf-turnstile-response': 'tok_valid',
    });
  });

  it('Web3Forms access_key ekler ve yalnız `success:true` yanıtını kabul eder', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, message: 'Email sent' }));
    await expect(
      submitContactForm(
        buildForm({
          provider: 'web3forms',
          endpoint: 'https://api.web3forms.com/submit',
          accessKey: 'web3-key',
        }),
      ),
    ).resolves.toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      name: 'Ada',
      email: 'ada@example.com',
      message: 'Merhaba',
      access_key: 'web3-key',
      'cf-turnstile-response': 'tok_valid',
    });
  });

  it.each(['custom', 'web3forms'])(
    '%s 2xx içinde `success:false` dönerse başarısız sayılır',
    async (provider) => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, code: 'TURNSTILE_FAILED' }));
      await expect(
        submitContactForm(
          buildForm({
            provider,
            endpoint:
              provider === 'custom'
                ? 'https://forms.example.com/v1/forms/nafrucom/contact'
                : 'https://api.web3forms.com/submit',
            accessKey: provider === 'web3forms' ? 'web3-key' : undefined,
          }),
        ),
      ).rejects.toThrow('success:true');
    },
  );

  it('Web3Forms access key eksikse istek atmadan hata verir', async () => {
    await expect(
      submitContactForm(buildForm({ provider: 'web3forms', endpoint: 'https://api.web3forms.com/submit' })),
    ).rejects.toThrow('access key');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Turnstile token eksikse istek atmadan hata verir', async () => {
    await expect(
      submitContactForm(
        buildForm({
          provider: 'custom',
          endpoint: 'https://forms.example.com/v1/forms/nafrucom/contact',
          turnstile: '',
        }),
      ),
    ).rejects.toThrow('Turnstile');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('bilinmeyen provider istek atmadan reddedilir', async () => {
    await expect(
      submitContactForm(buildForm({ provider: 'other', endpoint: 'https://example.com/form' })),
    ).rejects.toThrow('provider');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('custom Worker 2xx + success:true döndürürse true döner', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, submissionId: 'sub_4' }));
    await expect(
      submitContactForm(
        buildForm({ provider: 'custom', endpoint: 'https://forms.example.com/v1/forms/nafrucom/contact' }),
      ),
    ).resolves.toBe(true);
  });

  it('Web3Forms response gövdesi JSON değilse başarısız sayılır', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } }),
    );
    await expect(
      submitContactForm(
        buildForm({
          provider: 'web3forms',
          endpoint: 'https://api.web3forms.com/submit',
          accessKey: 'web3-key',
        }),
      ),
    ).rejects.toThrow('success:true');
  });

  it('Formspark 2xx dışı yanıtta ApiError fırlatır', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'spam' }, 422));
    await expect(
      submitContactForm(buildForm({ provider: 'formspark', endpoint: 'https://submit-form.com/abc123' })),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('data-endpoint yoksa istek ATMADAN hata fırlatır', async () => {
    await expect(submitContactForm(buildForm())).rejects.toThrow('data-endpoint');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Formspark response gövdesi boş olsa da 2xx ise başarılı sayılır', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(
      submitContactForm(buildForm({ provider: 'formspark', endpoint: 'https://submit-form.com/abc123' })),
    ).resolves.toBe(true);
  });

  it('custom payload Web3Forms access key`ini taşımaz', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));
    await submitContactForm(
      buildForm({
        provider: 'custom',
        endpoint: 'https://forms.example.com/v1/forms/nafrucom/contact',
        accessKey: 'must-not-leak',
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty('access_key');
  });
});
