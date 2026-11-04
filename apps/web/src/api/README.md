# `src/api/` — Tarayıcı-taraflı API istemcisi

Şablon **statik** build ürettiği için içinde server-side endpoint yok. İletişim formu ayrı bir
custom Worker'a, Formspark'a veya Web3Forms'a gönderilebilir. Newsletter gibi diğer çağrılar da
harici servislere delege edilir. Bu klasördeki istemci ortak HTTP davranışını, servis dosyalarıysa
provider'a özgü payload ve başarı sözleşmesini toplar.

---

## API'yi kullanma

İki yöntem, hepsi native `fetch` üstüne kurulu:

```ts
import { api, ApiError } from '@/api/client';

// 1) GET
const data = await api.get<{ items: Item[] }>('https://api.example.com/items');

// 2) POST — body FormData ise multipart, aksi halde JSON
const fd = new FormData();
fd.append('name', 'Ada');
await api.post('https://submit-form.com/YOUR-FORM-ID', fd);

// 2b) JSON POST
await api.post('https://api.example.com/items', { name: 'Ada' });

// 3) İletişim formu: provider adaptörünü kullanın
import { submitContactForm } from '@/api/services/contact.service';
const form = document.querySelector<HTMLFormElement>('form')!;
await submitContactForm(form);
```

Tüm yöntemler 2xx dışı yanıtta `ApiError` fırlatır:

```ts
import { ApiError } from '@/api/client';

try {
  await api.post(endpoint, new FormData(form));
} catch (err) {
  if (err instanceof ApiError) {
    console.error(`${err.status} ${err.url}: ${JSON.stringify(err.body)}`);
  } else {
    throw err;
  }
}
```

---

## İletişim formu provider'ı

`wrangler.toml` içinde tek provider seçilir:

```toml
PUBLIC_FORMS_PROVIDER = "custom" # custom | formspark | web3forms
PUBLIC_FORMS_ENDPOINT = "https://forms-api.example.com/v1/forms/example/contact"
PUBLIC_FORMS_ACCESS_KEY = "" # yalnız Web3Forms
PUBLIC_TURNSTILE_SITE_KEY = "..."
PUBLIC_TURNSTILE_ACTION = "contact"
```

Custom endpoint ve Formspark endpoint'i `PUBLIC_FORMS_ENDPOINT`'ten okunur. Web3Forms resmi
endpoint'i otomatik seçilir ve access key yalnız onun JSON payload'ına eklenir. Turnstile secret
asla bu repodaki `PUBLIC_*` değişkenlerine konmaz: custom kullanımda ayrı Worker secret'ıdır;
Formspark/Web3Forms kullanımında sağlayıcı paneline girilir. Web3Forms Turnstile desteği Pro'dur.

Ortak form alanları `name`, `email`, `message`, `website` honeypot'u ve
`cf-turnstile-response` token'ıdır. Adaptör Formspark için honeypot'u `_gotcha` adına çevirir
ve Web3Forms için `access_key` ekler.

Custom sağlayıcıda (nafru-form gateway) sözleşme dar ve KATIDIR: `name` 2-120, `email` en çok
254, `message` 10-5000 karakter; `website` gönderilecekse BOŞ olmalıdır — dolu honeypot
`INVALID_SUBMISSION` ile reddedilir. Bu sınırlar markup'ta `minlength`/`maxlength` olarak da
bildirilir; aksi halde kullanıcı sunucudan gelen ayrımsız bir hata görürdü. `formStartedAt`
sözleşmeden ÇIKARILDI (bkz. nafru-form/README.md "API behavior") ve artık gönderilmez.

---

## Sözleşme özeti

| Yöntem                      | Body                     | Content-Type                |
| --------------------------- | ------------------------ | --------------------------- |
| `api.get(url)`              | —                        | —                           |
| `api.post(url, jsonObject)` | `JSON.stringify`         | `application/json`          |
| `api.post(url, formData)`   | `FormData` (boundary'li) | tarayıcı tarafından eklenir |

Form gönderimi tek başına `api.post(url, new FormData(form))` çağrısıdır; URL `form.dataset.endpoint`
üzerinden okunur. Çağrı yerine argüman geçirilmediği sürece tek satırlık kalır.

---

## `ApiError` anatomisi

```ts
class ApiError extends Error {
  status: number;   // HTTP durum kodu (ör. 400, 500)
  body: unknown;    // ayrıştırılmış gövde: JSON ise object, değilse string
  url: string;      // çağrılan URL — hangi endpoint başarısız olduğunu günlüğe yazmak için
}
```

`status === 0` görürseniz bu network/parse hatasıdır (fetch'in kendisi `TypeError` fırlattı);
`api` istemcisi onu doğrudan `TypeError` olarak yayar, `ApiError` sarmaz.
