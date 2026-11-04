/** Yorum slider'ının ileri/geri düğmelerini kaydırma kabına bağlar. */
export function initTestimonials() {
  document.addEventListener('click', (e) => {
    const target = e.target as Element;
    const dir = target.closest?.('[data-slide-next]') ? 1 : target.closest?.('[data-slide-prev]') ? -1 : 0;
    if (!dir) return;
    const slider = document.querySelector<HTMLElement>('[data-slider]');
    slider?.scrollBy({ left: dir * slider.clientWidth * 0.5, behavior: 'smooth' });
  });
}
