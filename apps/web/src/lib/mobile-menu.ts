// Açık/kapalı durumu tek yerden yönetilir: `hidden`, `aria-expanded`, `aria-label`, sayfa kaydırma
// kilidi ve odak birlikte değişmeli — üç kapatma yolu (düğme, link, Escape) olduğu için senkron
// kaçmaya açık.
const setMenu = (open: boolean) => {
  const menu = document.querySelector<HTMLElement>('[data-mobile-menu]');
  const toggle = document.querySelector<HTMLElement>('[data-menu-toggle]');
  if (!menu || !toggle) return;
  menu.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  const labels = JSON.parse(toggle.getAttribute('data-menu-labels') ?? '{}');
  toggle.setAttribute('aria-label', open ? labels.close : labels.open);
  // Tam ekran panel açıkken arkadaki sayfa kaymasın.
  document.documentElement.style.overflow = open ? 'hidden' : '';
  if (open) menu.querySelector<HTMLElement>('[data-menu-close]')?.focus();
};

/** Tam ekran mobil menüyü düğmeler, linkler ve Escape ile açar/kapatır. */
export function initMobileMenu() {
  document.addEventListener('click', (e) => {
    const target = e.target as Element;
    const menu = document.querySelector<HTMLElement>('[data-mobile-menu]');
    if (!menu) return;
    if (target.closest?.('[data-menu-toggle]')) {
      setMenu(menu.hidden);
    } else if (target.closest?.('[data-menu-close]')) {
      setMenu(false);
      document.querySelector<HTMLElement>('[data-menu-toggle]')?.focus();
    } else if (target.closest?.('[data-mobile-menu] a')) {
      setMenu(false);
    }
  });

  // Escape açık menüyü kapatır ve odağı düğmeye geri verir; aksi halde odak görünmez panelde kalır.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const menu = document.querySelector<HTMLElement>('[data-mobile-menu]');
    if (!menu || menu.hidden) return;
    setMenu(false);
    document.querySelector<HTMLElement>('[data-menu-toggle]')?.focus();
  });

  // Sayfa geçişinde kilit kalmasın (yeni sayfanın menüsü kapalı gelir).
  document.addEventListener('astro:after-swap', () => {
    document.documentElement.style.overflow = '';
  });
}
