import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function initReveals() {
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 32,
      autoAlpha: 0,
      duration: 0.8,
      ease: 'power2.out',
      delay: Number(el.dataset.revealDelay ?? 0),
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });
}

function initCounters() {
  document.querySelectorAll<HTMLElement>('[data-counter]').forEach((el) => {
    const target = Number(el.dataset.counter ?? 0);
    const suffix = el.dataset.counterSuffix ?? '';
    const state = { value: 0 };
    // Sunucu son değeri basar (JS'siz ve reduced-motion okuyucu doğru sayıyı görür); animasyon
    // yalnızca burada, sıfırdan başlatılır.
    el.textContent = (0).toLocaleString(document.documentElement.lang || 'tr') + suffix;
    gsap.to(state, {
      value: target,
      duration: 2,
      ease: 'power1.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
      onUpdate: () => {
        el.textContent =
          Math.round(state.value).toLocaleString(document.documentElement.lang || 'tr') + suffix;
      },
    });
  });
}

function initSplitTitles() {
  document.querySelectorAll<HTMLElement>('[data-split-title]').forEach((el) => {
    const split = SplitText.create(el, { type: 'words' });
    // Split, gizlemeyi kelime `div`'lerinde `autoAlpha` ile yönetir; onlar `visibility: inherit`
    // kullanır (GSAP'in autoAlpha'sının kendi standardı — "visible" DEĞİL). Bu yüzden
    // `[data-split-title]` (bkz. global.css'teki `.js-anim` FOUC koruması) görünür kılınmazsa
    // kelimeler asla üst öğenin `hidden`'ını miras almaktan kurtulamaz ve kalıcı görünmez kalır.
    el.style.visibility = 'visible';
    gsap.from(split.words, {
      yPercent: 60,
      autoAlpha: 0,
      duration: 0.7,
      ease: 'power3.out',
      stagger: 0.05,
    });
  });
}

export function initAnimations() {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  if (prefersReducedMotion()) return;
  initSplitTitles();
  initReveals();
  initCounters();
}
