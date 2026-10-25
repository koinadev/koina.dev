import { submitContactForm } from '../api/services/contact.service';
import { track } from './analytics'; // @feature:analytics

// api.js kutuları yalnızca kendi yüklendiği anda otomatik çizer; view transition aynı src'li
// script'i ikinci kez çalıştırmaz, yani istemci-taraflı gezinmeyle gelindiğinde kutu boş
// kalıyordu (form token'sız gönderiliyordu — ölçüldü). Çözüm: api.js `?render=explicit` ile
// yüklenir (bkz. ContactForm.astro), çizmek/kaldırmak bu modülün işi. Dinleyiciler `document`te —
// `initContactForm` her sayfa girişinde yeniden çağrılır, elemana referans tutulmaz.
let widgetId: string | undefined;

const renderTurnstile = () => {
  const el = document.querySelector<HTMLElement>('.cf-turnstile');
  // Kutu yoksa (iletişim formu olmayan sayfa) ya da zaten çizilmişse hiçbir şey yapma.
  if (!el) return;
  if (widgetId) return;
  // api.js HENÜZ yüklenmediyse bu bir hata DEĞİL, sadece erken: `nafru:turnstile-ready`
  // bizi yeniden çağıracak. Burada uyarmak soğuk cache'te her yüklemede sahte alarm üretiyordu.
  if (!window.turnstile) return;
  widgetId = window.turnstile.render(el, {
    sitekey: el.dataset.sitekey ?? '',
    action: el.dataset.action ?? 'contact',
  });
};

const removeTurnstile = () => {
  if (!widgetId || !window.turnstile) return;
  window.turnstile.remove(widgetId);
  widgetId = undefined;
};

/** Turnstile'ı çizer/kaldırır ve iletişim formunun gönderim akışını bağlar. */
export function initContactForm() {
  document.addEventListener('astro:before-swap', removeTurnstile);
  document.addEventListener('astro:page-load', renderTurnstile);
  document.addEventListener('nafru:turnstile-ready', renderTurnstile);
  // GERÇEK başarısızlık yalnızca burada bilinir (ağ hatası, engelleyici). Sessiz kalırsak form
  // token'sız gönderilir ve kullanıcı yalnızca genel hatayı görür — teşhis edilemeyen bir hata.
  document.addEventListener('nafru:turnstile-error', () => {
    console.warn('Turnstile api.js yüklenemedi; iletişim formu gönderilemeyecek.');
  });
  renderTurnstile();

  // DELEGE listener: BaseLayout `<ClientRouter />` render ettiği için view transition DOM'u
  // değiştirir; forma doğrudan bağlanan bir listener ilk geçişte kaybolur.
  document.addEventListener('submit', async (e) => {
    const form = (e.target as HTMLElement)?.closest?.('[data-contact-form]') as HTMLFormElement | null;
    if (!form) return;
    e.preventDefault();

    const status = form.querySelector<HTMLElement>('[data-form-status]');
    const button = form.querySelector<HTMLButtonElement>('button[type=submit]');
    // Markup Astro tarafından üretildiği için bunlar normalde her zaman bulunur; yine de
    // preventDefault sonrası sessiz ölmemek adına guard'lıyoruz.
    if (!status || !button) return;

    let labels: Record<string, string> = {};
    try {
      labels = JSON.parse(form.dataset.labels ?? '{}') as Record<string, string>;
    } catch {
      labels = {};
    }
    // labels boş kalırsa düğmede/mesajda "undefined" yazmasın: sunucudan render edilmiş
    // mevcut etiketi yedek olarak tutuyoruz.
    const fallbackLabel = button.textContent ?? '';

    button.disabled = true;
    button.textContent = labels.sending ?? fallbackLabel;
    status.hidden = true;
    try {
      const ok = await submitContactForm(form);
      status.hidden = false;
      status.className = ok
        ? 'rounded-lg bg-green-100 px-4 py-3 text-sm text-green-800 dark:bg-green-900/40 dark:text-green-300'
        : 'rounded-lg bg-red-100 px-4 py-3 text-sm text-red-800 dark:bg-red-900/40 dark:text-red-300';
      status.textContent = (ok ? labels.success : labels.error) ?? '';
      // Dönüşüm olayı TIKLAMADA değil SONUÇTA atılır: gönder düğmesine basmak Turnstile
      // doğrulaması ya da ağ hatasıyla bitebilir; tıklamayı saymak dönüşüm oranını şişirirdi.
      track('contact_submit'); // @feature:analytics
      if (ok) {
        form.reset();
        window.turnstile?.reset();
      }
    } catch {
      status.hidden = false;
      status.className =
        'rounded-lg bg-red-100 px-4 py-3 text-sm text-red-800 dark:bg-red-900/40 dark:text-red-300';
      status.textContent = labels.error ?? '';
      track('contact_error'); // @feature:analytics
    } finally {
      button.disabled = false;
      button.textContent = labels.submit ?? fallbackLabel;
    }
  });
}
