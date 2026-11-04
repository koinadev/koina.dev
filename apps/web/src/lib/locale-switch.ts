/**
 * Kök `/` sayfası dil algılarken önce `localStorage.locale`'a bakar; ziyaretçinin açık
 * tercihini dil değiştiriciye tıkladığı anda burada kaydediyoruz.
 */
export function initLocaleSwitch() {
  document.addEventListener('click', (e) => {
    const link = (e.target as Element).closest?.('[data-locale-switch]') as HTMLElement | null;
    const chosen = link?.dataset.localeSwitch;
    if (chosen) localStorage.setItem('locale', chosen);
  });
}
