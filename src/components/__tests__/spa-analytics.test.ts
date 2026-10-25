import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Bu dosya davranış değil, KAYNAK METİN sınıyor. Gerekçesi: aşağıdaki hata yalnızca gerçek bir
// tarayıcıda, gerçek bir view transition'dan sonra ortaya çıkıyordu — birim testle jsdom'da
// yeniden üretmek mümkün değil. Ama kök nedeni tek bir satırdı ve o satırın geri gelmesi
// statik olarak yakalanabilir. Amaç kapsam değil, REGRESYON KİLİDİ.
//
// AYRI DOSYA OLMASININ SEBEBİ: test, `analytics` özelliğine ait bir dosyayı OKUYOR. Aynı
// dosyada `forms` kilidiyle birlikte dururken `analytics` çıkarıldığında suite ENOENT ile
// çöküyordu. Marker'la sökmek de yetmezdi: iki kilit birden sökülünce
// dosyada hiç test kalmaz ve vitest "no test suite found" der. Bu yüzden her kilit kendi
// dosyasında ve manifest'te ait olduğu özelliğe bağlı.
describe('analytics guard (script not re-injected after a client-side page swap; pageview count must not inflate)', () => {
  const source = readFileSync('src/components/Analytics.astro', 'utf8');

  it("enjeksiyon guard'ı DOM sorgusu DEĞİL window bayrağı olmalı", () => {
    // DOM sorgusuna dayanan guard her geçişte "enjekte edilmemiş" der, çünkü `<head>` swap'ı
    // script elemanını siler. Sonuç: her geçişte bir örnek daha, pageview'lar +2, +3, +4...
    expect(source).toContain('window.__analyticsInjected');
    expect(source).not.toMatch(/querySelector\([^)]*analytics-script/);
  });

  it('dinleyiciler yalnızca bir kez bağlanmalı', () => {
    expect(source).toContain('window.__analyticsListenersBound');
  });

  // Plausible script'i (v36) yüklendiğinde `window.plausible.q` dizisini boşaltır:
  //   for (var c = window.plausible && window.plausible.q || [], ...) g.apply(this, c[r]);
  // Stub yoksa `defer` script yüklenene kadar atılan olaylar `window.plausible is not a function`
  // ile SESSİZCE kaybolur — onay verildikten hemen sonraki ilk tıklama tam bu aralığa düşer.
  it('Plausible kuyruk stub`ı script`ten ÖNCE tanımlanmalı', () => {
    expect(source).toContain('window.plausible.q');
    expect(source.indexOf('window.plausible.q')).toBeLessThan(source.indexOf('analytics.plausibleScriptUrl'));
  });

  // Plausible Ekim 2025'te siteye özel `pa-…js` snippet'ine geçti. Yeni snippet yalnızca
  // kuyruğu değil `plausible.init()` sözleşmesini de ister; eski `data-domain + script.js`
  // kurulumu yeni oluşturulan sitenin panelinden alınan snippet'le eşleşmez.
  it('Plausible panelinden alınan siteye özel script URL`ini güncel init sözleşmesiyle kullanmalı', () => {
    expect(source).toContain('analytics.plausibleScriptUrl');
    expect(source).toContain('window.plausible.init');
    expect(source).toContain('window.plausible.init()');
    expect(source).not.toContain("setAttribute('data-domain'");
    expect(source).not.toContain('https://plausible.io/js/script.js');
  });

  // Olay katmanı `is:inline` script'ten import EDİLEMEZ (`define:vars` bundle dışı bırakır);
  // ayrı bir modül script'inde durması bu yüzden sözleşmenin parçası.
  it('olay katmanı ayrı bir modül script`inden başlatılmalı', () => {
    expect(source).toContain("await import('../lib/analytics')");
    expect(source).toContain('initAnalytics()');
  });
});
