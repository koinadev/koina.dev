// Modül script'i oturumda bir kez çalışır; görünürlük `astro:page-load`'a bağlanmazsa henüz
// karar vermemiş ziyaretçide banner ilk geçişte kaybolur. Banner her seferinde yeniden
// sorgulanır — swap sonrası eleman yeni bir düğümdür.
const showIfUndecided = () => {
  const banner = document.querySelector<HTMLElement>('[data-consent-banner]');
  if (banner && !localStorage.getItem('cookie-consent')) banner.hidden = false;
};

/** Kararsız ziyaretçide banner'ı gösterir, kabul/red tıklamasını `localStorage`'a yazar. */
export function initConsentBanner() {
  showIfUndecided();
  document.addEventListener('astro:page-load', showIfUndecided);

  document.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest?.('[data-consent]') as HTMLElement | null;
    if (!btn) return;
    const banner = btn.closest<HTMLElement>('[data-consent-banner]');
    localStorage.setItem('cookie-consent', btn.dataset.consent ?? 'denied');
    if (banner) banner.hidden = true;
    if (btn.dataset.consent === 'granted') window.dispatchEvent(new Event('consent:granted'));
  });
}
