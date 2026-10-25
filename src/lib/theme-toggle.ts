/** Karanlık/aydınlık temayı değiştirir ve tercihi `localStorage`'a yazar. */
export function initThemeToggle() {
  document.addEventListener('click', (e) => {
    if (!(e.target as Element).closest?.('[data-theme-toggle]')) return;
    const dark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  });
}
