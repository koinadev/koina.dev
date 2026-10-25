// Tüm dinleyiciler `document`te, eleman her seferinde yeniden sorgulanır (elemana referans
// tutulmaz — swap sonrası eski düğüme yazmak sessiz no-op olurdu).

// Prefetch edilmiş sayfa 1-2 frame'de gelir; çubuğu hemen göstermek göz kırpması yaratır. Bu
// gecikmenin altında kalan geçişlerde çubuk hiç görünmez — istenen davranış bu.
const SHOW_DELAY = 140;
let timer: ReturnType<typeof setTimeout> | undefined;

const bar = () => document.querySelector<HTMLElement>('[data-nav-progress]');

const start = () => {
  clearTimeout(timer);
  timer = setTimeout(() => bar()?.setAttribute('data-active', ''), SHOW_DELAY);
};

const stop = () => {
  clearTimeout(timer);
  timer = undefined;
  // Swap olmadan biten gezinmeler (iptal, aynı sayfa hash'i) için gerekli.
  bar()?.removeAttribute('data-active');
};

/**
 * Gezinme ilerleme çubuğunu Astro'nun geçiş olaylarına bağlar.
 *
 * Bilinen sınır: hazırlık swap'a hiç ulaşmazsa (hedef getirilemezse) çubuk görünür kalır —
 * Astro başarısız hazırlık için olay yayınlamıyor. Pratikte başarısız getirme tam sayfa
 * yüklemeye düşer, o da çubuğu sıfırlar.
 */
export function initNavProgress() {
  document.addEventListener('astro:before-preparation', start);
  document.addEventListener('astro:after-swap', stop);
  document.addEventListener('astro:page-load', stop);
}
