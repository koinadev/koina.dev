import type { IconName } from '../lib/icons';
import type { PhotoName } from '../lib/photos';
import type { RouteKey } from '../i18n/routes';

// Bilgi sayfalarının içerik şeması. Sayfa bileşeni (`InfoPage.astro`) blokları sırayla çizer;
// yeni sayfa eklemek yalnızca içerik yazmaktır.

/** Site içi bağlantı: ya route anahtarı ya da tam adres (dış site, e-posta). */
export type Target = { route: RouteKey; hash?: string } | { href: string };
export type Action = { label: string } & Target;

export type IconItem = { icon: IconName; title: string; text: string; link?: Action };

export type Block =
  // Düz metin. `aside` varsa yanında el yazısı bir not durur.
  | { type: 'prose'; title?: string; body: string[]; aside?: string }
  // Fotoğraf + metin, iki sütun.
  | { type: 'split'; title: string; body: string[]; photo: PhotoName; photoAlt: string; reverse?: boolean }
  // İkonlu kartlar.
  | { type: 'cards'; title?: string; intro?: string; items: IconItem[]; columns?: 2 | 3 }
  // Gerçekten sıralı süreçler; numara yalnızca burada.
  | { type: 'steps'; title?: string; intro?: string; items: { title: string; text: string }[] }
  // Madde listesi (kurallar, ilkeler).
  | { type: 'list'; title?: string; intro?: string; items: string[]; tone?: 'do' | 'dont' }
  // Büyük alıntı.
  | { type: 'quote'; text: string; by?: string }
  // Soru-cevap; sayfaya FAQPage JSON-LD de basar.
  | { type: 'faq'; title?: string; items: { question: string; answer: string }[] }
  // Küçük, eğlenceli adımlar: süre etiketiyle.
  | {
      type: 'tiny';
      title?: string;
      intro?: string;
      items: { icon: IconName; title: string; time: string; link?: Action }[];
    }
  // Sponsorluk paketleri.
  | {
      type: 'tiers';
      title?: string;
      intro?: string;
      items: { name: string; who: string; perks: string[]; featured?: boolean }[];
    }
  // Destekçi listesi; boşsa davet kartı gösterilir.
  | {
      type: 'sponsors';
      title: string;
      intro?: string;
      items: { name: string; href: string }[];
      empty: string;
      emptyAction: Action;
    }
  // Tablo benzeri iki sütunlu satırlar (gün/saat, lisans/izin).
  | {
      type: 'rows';
      title?: string;
      intro?: string;
      items: { label: string; value: string; note?: string }[];
    };

export interface InfoPage {
  meta: { title: string; description: string };
  hero: { note?: string; title: string; lead: string; photo?: PhotoName; photoAlt?: string };
  blocks: Block[];
  cta?: { title: string; text: string; primary: Action; secondary?: Action };
}
