import type { TransitionDirectionalAnimations } from 'astro';

// Sayfa geçişinin görsel dili: eski sayfa OLDUĞU YERDE ve TAM OPAK bekler, yeni sayfa üstüne
// solarak ve 12px yükselerek oturur.
//
// GEÇİŞ `<html>` ÜZERİNDE, `<main>` ÜZERİNDE DEĞİL — ölçülen hata buydu: `<main>` adlandırılmış
// geçiş aldığında tarayıcı öğenin TAMAMININ anlık görüntüsünü alır ve
// `::view-transition-group` eski konumdan (sayfa 2000px kaydırılmışken `top: -2000px`) yeni
// konuma (`top: 0`) 250ms boyunca taşır. Görünen şey her gezinmede eski sayfanın hızla yukarı
// kayması. Kök anlık görüntüsü ise yalnızca GÖRÜNÜM ALANIDIR: taşınacak bir konum farkı yoktur,
// eski görüntü kullanıcının bıraktığı yerde kalır.
//
// Eski katman solmaz: `::view-transition-new` üstte boyanır ve bitişte tam opaktır. İkisi birden
// yarı saydam kalsaydı aralarından kök arka planı görünür, geçiş "ağarırdı".
//
// İleri/geri aynı animasyonu kullanır — yön farkı yalnızca yönlü harekette anlamlıdır.
//
// reduced-motion kontrolü burada yok ve gerekmiyor: Astro'nun `viewtransitions.css`'i
// `prefers-reduced-motion` altında tüm view transition animasyonlarını zaten kapatıyor.
const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
const DURATION = '280ms';

const pagePair = {
  // Keyframe'ler src/styles/global.css içinde.
  old: { name: 'nafruPageHold', duration: DURATION, easing: 'linear', fillMode: 'both' },
  new: { name: 'nafruPageIn', duration: DURATION, easing: EASE, fillMode: 'both' },
};

/** `<html>` için geçiş animasyonu. Sabit/yapışkan üst bilgi kendi adını taşır ve yerinde durur. */
export const pageTransition: TransitionDirectionalAnimations = {
  forwards: pagePair,
  backwards: pagePair,
};
