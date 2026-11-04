import { api } from '../client';

export type FormProvider = 'custom' | 'formspark' | 'web3forms';

type ProviderResponse = { success?: unknown } | string | null;

const providers = new Set<FormProvider>(['custom', 'formspark', 'web3forms']);

function stringField(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}

function resolveProvider(form: HTMLFormElement): FormProvider {
  const provider = form.dataset.provider;
  if (!provider || !providers.has(provider as FormProvider)) {
    throw new Error(`Geçersiz form provider: ${provider || '(boş)'}`);
  }
  return provider as FormProvider;
}

function buildPayload(form: HTMLFormElement, provider: FormProvider): Record<string, string | number> {
  const data = new FormData(form);
  const turnstile = stringField(data, 'cf-turnstile-response');
  if (!turnstile) throw new Error('Turnstile doğrulaması tamamlanmadan form gönderilemez');

  const payload: Record<string, string | number> = {
    name: stringField(data, 'name'),
    email: stringField(data, 'email'),
    message: stringField(data, 'message'),
  };

  if (provider === 'custom') {
    // Gateway'in KABUL ETTİĞİ tek ek alan budur ve BOŞ olmak zorundadır: dolu `website`
    // `INVALID_SUBMISSION` ile reddedilir. `formStartedAt` sözleşmeden çıkarıldı
    // (bkz. nafru-form/README.md "API behavior"); gönderilmesi gereksiz alan taşımaktı.
    payload.website = stringField(data, 'website');
  } else if (provider === 'formspark') {
    // Formspark'ın yerleşik honeypot alanı. Ortak markup'taki `website` değeri sağlayıcıya
    // burada çevrilir; kullanıcı alanları sağlayıcı ayrıntılarıyla kirlenmez.
    payload._gotcha = stringField(data, 'website');
  } else {
    const accessKey = form.dataset.accessKey;
    if (!accessKey) throw new Error('Web3Forms için access key eksik');
    payload.access_key = accessKey;
  }

  payload['cf-turnstile-response'] = turnstile;
  return payload;
}

function hasExplicitSuccess(response: ProviderResponse): boolean {
  return typeof response === 'object' && response !== null && response.success === true;
}

/**
 * İletişim formunu custom Worker'a veya seçilen form servisine gönderir. Endpoint
 * `form.dataset.endpoint`'ten okunur.
 *
 * Gövde JSON olarak gider (FormData/multipart DEĞİL): Formspark AJAX sözleşmesi `Content-Type`
 * ve `Accept`in ikisinin de `application/json` olmasını ister, ayrıca `_email.subject` gibi
 * seçenekler yalnızca iç içe JSON nesnesi olarak geçirilebilir — multipart'ta bu mümkün değil.
 * Turnstile token'ı provider adaptörü tarafından açıkça gövdeye eklenir ve mutlaka sunucu veya
 * sağlayıcı tarafında doğrulanır.
 */
export async function submitContactForm(form: HTMLFormElement): Promise<boolean> {
  const provider = resolveProvider(form);
  const endpoint = form.dataset.endpoint;
  if (!endpoint) throw new Error('Formda data-endpoint özniteliği eksik');
  const response = await api.post<ProviderResponse>(endpoint, buildPayload(form, provider));

  // Formspark'ın 2xx gövdesi bir kayıt nesnesidir; başarı bayrağı sözleşmesi yoktur. Custom
  // Worker ve Web3Forms ise aynı `{ success: boolean }` zarfını kullanır. Bu ikisinde yalnız 2xx'e
  // bakmak `success:false` yanıtını dönüşüm diye sayardı.
  if (provider !== 'formspark' && !hasExplicitSuccess(response)) {
    throw new Error(`${provider} yanıtında success:true bulunamadı`);
  }
  return true;
}
