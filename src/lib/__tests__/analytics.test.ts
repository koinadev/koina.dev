// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initAnalytics, track } from '../analytics';

// Sağlayıcı global'lerinin ikizleri. `track()` sağlayıcı ADINI okumaz, GLOBAL'in varlığına bakar
// (bkz. src/lib/analytics.ts) — testler de aynı sözleşmeyi kullanıyor.
const plausible = vi.fn();
const gtag = vi.fn();

function consent(value: 'granted' | 'denied' | null) {
  if (value === null) localStorage.removeItem('cookie-consent');
  else localStorage.setItem('cookie-consent', value);
}

/** Tıklamayı GERÇEK bir DOM olayı olarak üretir: delege dinleyici `event.target`'a bakıyor. */
function click(el: Element) {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

beforeEach(() => {
  plausible.mockReset();
  gtag.mockReset();
  document.body.innerHTML = '';
  localStorage.clear();
  // `__analyticsEventsBound` BİLEREK sıfırlanmıyor: bayrak "oturum başına tek bağlama"
  // sözleşmesinin kendisi ve happy-dom'da `document` testler arasında YAŞIYOR. Sıfırlansaydı
  // her test bir dinleyici daha eklerdi ve tek tıklama N olay üretirdi — yani test, guard'ı
  // doğrulamak yerine devre dışı bırakırdı (ölçüldü: 8. testte 8 çağrı).
  window.plausible = plausible;
  window.gtag = gtag;
});

describe('track', () => {
  it('ONAY YOKSA hiçbir sağlayıcıya gitmez', () => {
    consent(null);
    track('deneme');
    expect(plausible).not.toHaveBeenCalled();
    expect(gtag).not.toHaveBeenCalled();
  });

  it('onay REDDEDİLDİYSE de göndermez', () => {
    consent('denied');
    track('deneme');
    expect(plausible).not.toHaveBeenCalled();
  });

  it('onay varken her iki sağlayıcıya da gönderir', () => {
    consent('granted');
    track('deneme');
    expect(plausible).toHaveBeenCalledWith('deneme', undefined);
    expect(gtag).toHaveBeenCalledWith('event', 'deneme', {});
  });

  it('props VARSA Plausible sözleşmesine uygun sarmalar', () => {
    consent('granted');
    track('deneme', { plan: 'pro' });
    expect(plausible).toHaveBeenCalledWith('deneme', { props: { plan: 'pro' } });
  });

  it('sağlayıcı yapılandırılmamışsa sessizce hiçbir şey yapmaz', () => {
    consent('granted');
    window.plausible = undefined;
    window.gtag = undefined;
    expect(() => track('deneme')).not.toThrow();
  });
});

describe('initAnalytics — tıklama izleme', () => {
  beforeEach(() => {
    consent('granted');
    initAnalytics();
  });

  it('`data-analytics-event` taşıyan elemanı adıyla gönderir', () => {
    document.body.innerHTML = '<button data-analytics-event="hero_cta">Başla</button>';
    click(document.querySelector('button')!);
    expect(plausible).toHaveBeenCalledWith('hero_cta', undefined);
  });

  it('`data-analytics-*` özniteliklerini olay bağlamına çevirir', () => {
    document.body.innerHTML =
      '<button data-analytics-event="pricing_cta" data-analytics-plan="Pro">Al</button>';
    click(document.querySelector('button')!);
    expect(plausible).toHaveBeenCalledWith('pricing_cta', { props: { plan: 'Pro' } });
  });

  it('elemanın İÇİNDEKİ bir düğüme tıklamak da sayılır', () => {
    document.body.innerHTML = '<button data-analytics-event="hero_cta"><span>Başla</span></button>';
    click(document.querySelector('span')!);
    expect(plausible).toHaveBeenCalledWith('hero_cta', undefined);
  });

  it('DIŞ bağlantıyı otomatik sayar', () => {
    document.body.innerHTML = '<a href="https://baska-site.example/x">Dış</a>';
    click(document.querySelector('a')!);
    expect(plausible).toHaveBeenCalledWith('outbound_click', {
      props: { url: 'https://baska-site.example/x' },
    });
  });

  it('İÇ bağlantıyı SAYMAZ — sayfa görüntülemeyi sağlayıcı zaten sayıyor', () => {
    document.body.innerHTML = '<a href="/tr/blog/">İç</a>';
    click(document.querySelector('a')!);
    expect(plausible).not.toHaveBeenCalled();
  });

  it('indirilebilir dosyayı `file_download` sayar', () => {
    document.body.innerHTML = '<a href="/dosyalar/katalog.pdf">Katalog</a>';
    click(document.querySelector('a')!);
    expect(plausible).toHaveBeenCalledWith('file_download', { props: { path: '/dosyalar/katalog.pdf' } });
  });

  it('`mailto:` bağlantısını iletişim tıklaması sayar', () => {
    document.body.innerHTML = '<a href="mailto:hello@example.com">Yaz</a>';
    click(document.querySelector('a')!);
    expect(plausible).toHaveBeenCalledWith('contact_click', { props: { method: 'email' } });
  });

  it('AÇIK ad otomatik tespitin ÖNÜNDE — tek olay atılır', () => {
    document.body.innerHTML =
      '<a href="https://baska-site.example/x" data-analytics-event="partner_link">Ortak</a>';
    click(document.querySelector('a')!);
    expect(plausible).toHaveBeenCalledTimes(1);
    expect(plausible).toHaveBeenCalledWith('partner_link', undefined);
  });

  it('`href` olmayan tıklama olay üretmez', () => {
    document.body.innerHTML = '<div>düz metin</div>';
    click(document.querySelector('div')!);
    expect(plausible).not.toHaveBeenCalled();
  });

  it('ikinci `initAnalytics()` çağrısı dinleyiciyi İKİ KEZ bağlamaz', () => {
    initAnalytics();
    initAnalytics();
    document.body.innerHTML = '<button data-analytics-event="hero_cta">Başla</button>';
    click(document.querySelector('button')!);
    expect(plausible).toHaveBeenCalledTimes(1);
  });
});
