# Animation

Bu şablonda hareket **kapalı bir sözleşme** üzerinden çalışır: bölüm bileşenleri GSAP'i
hiç import etmez, yalnızca `data-*` attribute'u koyar. Motorun tamamı
`src/lib/animations.ts` içindedir.

## Attribute convention

| Attribute             | Değer              | Ne yapar                                                                                                                                                                                  |
| --------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-reveal`         | (değersiz)         | Eleman görünüm alanına girince aşağıdan yukarı süzülerek belirir: `y: 32 → 0`, `autoAlpha: 0 → 1`, 0.8 sn, `power2.out`. Tetik: elemanın üstü ekranın %85'ine geldiğinde.                 |
| `data-reveal-delay`   | saniye, string     | `data-reveal` gecikmesi. Kart ızgaralarında sıralı giriş için kullanılır: `String((i % 3) * 0.1)`.                                                                                        |
| `data-counter`        | hedef sayı, string | 0'dan hedefe sayan sayaç. 2 sn, `power1.out`. Tetik: %90. Sayı `document.documentElement.lang` diline göre biçimlenir (`toLocaleString`).                                                 |
| `data-counter-suffix` | metin              | Sayacın sonuna eklenir (`%`, `+`, `K`…).                                                                                                                                                  |
| `data-split-title`    | (değersiz)         | Başlığı kelimelere böler ve kelimeleri sırayla yukarı süzer: `yPercent: 60 → 0`, 0.7 sn, `stagger: 0.05`. Scroll tetiği **yok** — sayfa yüklenince çalışır, hero başlığı için tasarlandı. |

Kullanım her zaman böyle görünür — bileşende JS yok:

```astro
<div data-reveal data-reveal-delay="0.2">…</div>
<h1 data-split-title>{hero.title}</h1>
<dd data-counter="1200" data-counter-suffix="+">0</dd>
```

`data-counter` taşıyan elemanın başlangıç metni `0` olmalıdır: JS kapalıysa ya da
reduced-motion açıksa gösterilen değer odur.

## How the engine works

`src/lib/animations.ts` tek bir dışa açık fonksiyon verir:

```ts
export function initAnimations() {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  if (prefersReducedMotion()) return;
  initSplitTitles();
  initReveals();
  initCounters();
}
```

Üç detay önemli:

1. **Önce tüm ScrollTrigger'lar öldürülür.** Fonksiyon her sayfa gezinmesinde yeniden
   çağrılır; temizlik yapılmazsa eski sayfanın tetikleyicileri birikir ve artık var olmayan
   elemanlara bağlı kalır.
2. **`prefers-reduced-motion` kontrolü kill'den SONRA, kurulumdan ÖNCE.** Yani tercih
   açıkken hiçbir animasyon kurulmaz ama eski tetikleyiciler yine de temizlenir.
3. **Sorgular her seferinde yeniden yapılır** (`document.querySelectorAll`). Eleman
   referansı saklanmaz — swap sonrası DOM'daki düğümler yenidir.

## Restart after view transition

Astro'nun view transition'ı sayfayı değiştirir ama bir modül script'ini **yeniden
çalıştırmaz**. Bu yüzden motor bir olaya bağlıdır — `src/layouts/BaseLayout.astro`:

```astro
<script>
  import { initAnimations } from '../lib/animations';
  document.addEventListener('astro:page-load', () => initAnimations());
</script>
```

`astro:page-load` hem ilk tam yüklemede hem her istemci-taraflı gezinmeden sonra tetiklenir,
dolayısıyla tek satır iki durumu birden kapatır.

**Kural:** her gezinmeden sonra tekrar koşması gereken her iş bu olaya bağlanır. Doğrudan
elemana bağlanan bir dinleyici ilk geçişten sonra ölür; bunun canlı örnekleri
[troubleshooting.md](./troubleshooting.md#script-doesnt-run-after-view-transition) sayfasında.

## Reduced-motion contract

Hareket **üç ayrı katmanda** kapatılır. Üçü de gereklidir; biri diğerini kapsamaz.

### 1. GSAP

`initAnimations()` erken döner (yukarıda). Elemanlar son hâllerinde kalır — `gsap.from()`
kullanıldığı için animasyon hiç kurulmazsa eleman zaten görünürdür. Sayaçlar hedef değeri
göstermez, `0` kalır; bu bilinçli bir takas (hareketsiz bir sayaç yalnızca son sayıyı
göstermek için JS gerektirirdi).

### 2. View transitions

`src/lib/transitions.ts` içinde **ek bir kontrol yoktur ve olmamalıdır.** Astro'nun kendi
`viewtransitions.css` dosyası `@media (prefers-reduced-motion)` altında tüm view transition
animasyonlarını (`::view-transition-group/old/new(*)` ve fallback
`[data-astro-transition-scope]`) `animation: none !important` ile kapatır. Buradaki
tanımlar o kuralın altında kalır.

### 3. CSS motion

`src/styles/global.css`:

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}
```

**DİKKAT:** bu blok bilerek `@layer` **dışındadır**. `scroll-behavior: smooth` kuralı
`@layer base` içindedir ve katmansız stiller katmanlı olanları özgüllükten **bağımsız
olarak** yener. Bu kuralı `@layer base` içine taşırsanız sessizce etkisiz kalır ve
reduced-motion tercihi kırılır.

Ayrıca marquee (`LogoCloud.astro`) Tailwind'in `motion-reduce:animate-none` yardımcı
sınıfıyla durur; `NavProgress` ise **durmaz** — bir süsleme değil, geri bildirim olduğu için
yalnızca geçiş süresi sıfırlanır ve çubuk anında tam genişlikte belirir.

## Visual language of page transitions

`src/lib/transitions.ts` `<main>` için bir `TransitionDirectionalAnimations` nesnesi verir;
`BaseLayout` onu `transition:animate={contentTransition}` ile uygular.

```
eski içerik:  astroFadeOut     80ms
yeni içerik:  astroFadeIn     170ms  (20ms gecikmeli)
            + nafruContentIn  240ms  (translateY(6px) → 0)
```

`astroFadeIn`/`astroFadeOut` Astro'nun kendi keyframe'leridir; `nafruContentIn` bu projeye
aittir ve `src/styles/global.css` içinde tanımlıdır — `@layer` ve `@theme` **dışında**,
çünkü view transition pseudo-element'leri belge kökünde yaşar ve keyframe'i global kapsamda
arar.

İleri ve geri yön **aynı** animasyonu kullanır: yön farkı ancak yönlü bir hareket varsa
anlamlıdır, solmada yön bildirmek yapay durur.

Header ve Footer bu geçişe **katılmaz**; kendi dosyalarında `transition:animate="none"`
taşırlar ve yerlerinde sabit dururlar. Sayfa değil, içerik değişmiş gibi hissettirir.

Geçiş süresini değiştirmek: `src/lib/transitions.ts` içindeki `duration` değerleri. 200 ms
altı "anlık", 400 ms üstü "yavaş" hissettirir; mevcut toplam ~240 ms.

## Adding a new animation

Sözleşmeyi bozmayın: bileşene GSAP import etmeyin, yeni bir `data-*` attribute'u tanımlayın.

1. **Attribute'u seçin** — `data-<isim>`, değer gerekiyorsa `data-<isim>-<alan>`.

2. **`src/lib/animations.ts` içine init fonksiyonu yazın:**

   ```ts
   function initParallax() {
     document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
       gsap.to(el, {
         yPercent: Number(el.dataset.parallax ?? 10),
         ease: 'none',
         scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
       });
     });
   }
   ```

3. **`initAnimations()` içinden çağırın** — `prefersReducedMotion()` kontrolünden **sonra**.

4. **Yeniden çalıştırılabilir olduğundan emin olun.** Fonksiyon her gezinmede yeniden
   koşacak. `ScrollTrigger` kullanıyorsanız temizlik zaten `initAnimations()` başındaki
   `kill()` ile yapılır. ScrollTrigger kullanmayan bir animasyon (ör. `initSplitTitles`
   gibi doğrudan çalışan) idempotent olmalı ya da kendi temizliğini yapmalı.

5. **Yeni GSAP plugin'i ekliyorsanız** dosyanın başındaki `gsap.registerPlugin(...)`
   çağrısına ekleyin. Şablon `ScrollTrigger` ve `SplitText` kullanır; GSAP 3'te tüm
   plugin'ler ücretsizdir.

6. **Bölümde kullanın:**

   ```astro
   <img src={hero.image.src} alt="" data-parallax="15" />
   ```

7. **Doğrulayın:** `bun run check && bun run build`, sonra tarayıcıda hem tam yüklemede hem
   bir iç linke tıklayarak geldiğinizde çalıştığını görün. İkinci kontrol atlanmamalı —
   bu şablonda "yalnızca tam yüklemede çalışıyor" hatası birden fazla kez yaşandı.

## Animationu tamamen kaldırmak

GSAP çıkarılabilir bir özellik **değildir** (çekirdeğin parçasıdır). Kaldırmak isterseniz
elle:

1. `src/layouts/BaseLayout.astro` sonundaki `<script>` bloğunu silin.
2. `src/lib/animations.ts` dosyasını silin.
3. `package.json` içinden `gsap` bağımlılığını çıkarın, `bun install` çalıştırın.
4. `data-reveal` / `data-counter` / `data-split-title` attribute'ları zararsız kalır, ama
   `data-counter` taşıyan elemanlar `0` gösterecektir — `src/components/sections/Stats.astro`
   içindeki başlangıç metnini gerçek değerle değiştirin.
