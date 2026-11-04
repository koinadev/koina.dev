/**
 * Bülten formunu Koina API'ye JSON olarak gönderir ve sonucu formun altında gösterir. Dinleyici
 * `document` üzerinde ve bir kez bağlanır: view transition formu her gezinmede yeniler,
 * forma doğrudan bağlanan dinleyici ilk gezinmede kaybolurdu (bkz. contact-form.ts).
 */
export function initNewsletter(): void {
  if (window.__newsletterBound) return;
  window.__newsletterBound = true;

  document.addEventListener('submit', async (event) => {
    const form = (event.target as Element | null)?.closest<HTMLFormElement>('form[data-newsletter]');
    if (!form || form.getAttribute('action') === '#') return;
    event.preventDefault();
    const status = form.parentElement?.querySelector<HTMLElement>('[data-newsletter-status]');
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const data = new FormData(form);
    const show = (text: string | undefined, ok?: boolean) => {
      if (!status) return;
      status.textContent = text ?? '';
      status.classList.toggle('text-primary-text', ok === true);
      status.classList.toggle('text-live', ok === false);
    };

    show(form.dataset.sending);
    if (button) button.disabled = true;
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: data.get('email'),
          locale: form.dataset.locale,
          website: data.get('website') ?? '',
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      show(form.dataset.success, true);
    } catch {
      show(form.dataset.error, false);
    } finally {
      if (button) button.disabled = false;
    }
  });
}
