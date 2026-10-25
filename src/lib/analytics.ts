/**
 * Sağlayıcıdan bağımsız OLAY katmanı.
 *
 * Sayfa görüntüleme sağlayıcının kendi script'inin işi (Plausible ve GA4 ikisi de `pushState`
 * kancalar, yani view transition'lı gezinmeleri kendileri sayar). Bu modül onun ÜSTÜNDEKİ
 * katman: hangi düğmeye basıldı, hangi form gönderildi, hangi dış bağlantıya gidildi.
 *
 * Sağlayıcı adı burada OKUNMAZ. Her sağlayıcının global fonksiyonu yalnızca o sağlayıcı
 * yapılandırıldığında tanımlanır (bkz. Analytics.astro), dolayısıyla "global var mı" kontrolü
 * yönlendirme için yeterlidir ve yapılandırmanın tek doğruluk kaynağı site.config'te kalır.
 */

/** Olaya iliştirilen bağlam. Plausible ve GA4 ikisi de düz anahtar/değer bekler. */
export type AnalyticsProps = Record<string, string | number | boolean>;

const CONSENT_KEY = 'cookie-consent';

function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'granted';
  } catch {
    // Sıkı gizlilik ayarlarında `localStorage` erişimi FIRLATIR (üçüncü-taraf çerez engeli,
    // Safari private mode). Onay okunamıyorsa onay YOKTUR — sessizce izlemeye devam etmek
    // consent banner'ının varlık sebebini ortadan kaldırırdı.
    return false;
  }
}

/**
 * Tek bir olay gönderir. Onay yoksa ya da sağlayıcı yapılandırılmamışsa SESSİZCE hiçbir şey yapmaz
 * — çağrı yerleri koşul yazmak zorunda kalmasın.
 */
export function track(name: string, props: AnalyticsProps = {}): void {
  if (!hasConsent()) return;
  const hasProps = Object.keys(props).length > 0;
  // Plausible: props verilmediğinde ikinci argüman HİÇ gönderilmemeli, boş `{props:{}}` değil.
  window.plausible?.(name, hasProps ? { props } : undefined);
  window.gtag?.('event', name, props);
}

// İndirme sayılan uzantılar. Beyaz liste, kara liste değil: `/fiyatlar.html` gibi yolların
// yanlışlıkla indirme sayılmaması için.
const DOWNLOAD_EXT = /\.(pdf|zip|rar|7z|csv|xlsx?|docx?|pptx?|mp3|mp4|dmg|exe|pkg|apk)$/i;

/**
 * Bir bağlantı için OTOMATİK olay üretir. İç gezinme için `null` döner — onu zaten sağlayıcının
 * kendi pageview kancası sayıyor, ikinci kez saymak dönüşüm oranlarını bozardı.
 */
function autoEvent(link: HTMLAnchorElement): { name: string; props: AnalyticsProps } | null {
  const raw = link.getAttribute('href');
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw, location.href);
  } catch {
    // `href="{{ }}"` gibi bozuk değerler analitiği çökertmemeli.
    return null;
  }
  if (url.protocol === 'mailto:') return { name: 'contact_click', props: { method: 'email' } };
  if (url.protocol === 'tel:') return { name: 'contact_click', props: { method: 'phone' } };
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (DOWNLOAD_EXT.test(url.pathname)) return { name: 'file_download', props: { path: url.pathname } };
  if (url.host !== location.host) return { name: 'outbound_click', props: { url: url.href } };
  return null;
}

/**
 * `data-analytics-*` özniteliklerini olay bağlamına çevirir: `data-analytics-plan="pro"` →
 * `{ plan: 'pro' }`. Olay adının kendisi (`data-analytics-event`) bağlama dahil edilmez.
 */
function collectProps(el: HTMLElement): AnalyticsProps {
  const props: AnalyticsProps = {};
  for (const [key, value] of Object.entries(el.dataset)) {
    if (key === 'analyticsEvent' || !key.startsWith('analytics') || value === undefined) continue;
    const name = key.slice('analytics'.length);
    props[name.charAt(0).toLowerCase() + name.slice(1)] = value;
  }
  return props;
}

/**
 * Tıklama izlemeyi bağlar. İki kaynak:
 * - AÇIK: `data-analytics-event="..."` taşıyan herhangi bir eleman (bkz. Button.astro).
 * - OTOMATİK: dış bağlantı, dosya indirme, `mailto:`/`tel:` — sıfır yapılandırma.
 */
export function initAnalytics(): void {
  // `window` bayrağı, DOM sorgusu DEĞİL: view transition `<head>`/`<main>`i değiştirir ama
  // `window` swap'tan sağ çıkar (aynı gerekçe: Analytics.astro'daki enjeksiyon guard'ı).
  if (window.__analyticsEventsBound) return;
  window.__analyticsEventsBound = true;

  // TEK delege dinleyici, `document` üzerinde: elemana doğrudan bağlanan bir dinleyici ilk
  // istemci-taraflı gezinmede kaybolurdu (ölçüldü — bkz. src/lib/contact-form.ts).
  document.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    if (!target?.closest) return;

    // AÇIK niyet, otomatik tespitin ÖNÜNDE: bir CTA hem isimlendirilmiş hem dış bağlantı
    // olabilir; o durumda yazarın verdiği ad kazanır ve tek olay atılır, iki değil.
    const named = target.closest<HTMLElement>('[data-analytics-event]');
    if (named?.dataset.analyticsEvent) {
      track(named.dataset.analyticsEvent, collectProps(named));
      return;
    }

    const link = target.closest<HTMLAnchorElement>('a[href]');
    if (!link) return;
    const auto = autoEvent(link);
    if (auto) track(auto.name, auto.props);
  });
}
