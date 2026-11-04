# Analytics kurulum ve doğrulama checklist'i

Şablon sayfa görüntülemelerini seçilen sağlayıcının script'ine bırakır; önemli CTA, form sonucu,
dış bağlantı ve dosya indirme olaylarını `src/lib/analytics.ts` üzerinden gönderir. Script ve olaylar
yalnızca ziyaretçi consent banner'ında kabul verdikten sonra çalışır.

## Sağlayıcı seçimi

### Plausible

- [ ] Plausible'da site canonical domain ile oluşturuldu.
- [ ] **Site Settings → General → Site Installation** ekranındaki siteye özel script URL'i
      (`https://plausible.io/js/pa-….js`) kopyalandı.
- [ ] `wrangler.toml` değerleri ayarlandı:

  ```toml
  PUBLIC_ANALYTICS_PROVIDER = "plausible"
  PUBLIC_ANALYTICS_PLAUSIBLE_SCRIPT_URL = "https://plausible.io/js/pa-XXXXX.js"
  ```

- [ ] Plausible panelinde otomatik **Outbound links**, **File downloads** ve **Form submissions**
      kapalı. Şablon bunları kendi anlamlı olaylarıyla ölçer; ikisini birden açmak aynı etkileşimi
      iki ayrı event olarak sayar.
- [ ] Dönüşüm olarak kullanılacak custom event'ler Goals altında tanımlandı. Plausible custom event'leri
      billable monthly pageview toplamına dahil eder; her sıradan tıklamayı event'e çevirmeyin.

Yeni Plausible snippet'i `data-domain` kullanmaz ve `plausible.init()` ister. Eski
`https://plausible.io/js/script.js` değerini veya yalnızca domain adını bu alana yazmayın.

### Google Analytics 4

- [ ] GA4 property ve canonical domain için Web data stream oluşturuldu.
- [ ] `wrangler.toml` değerleri ayarlandı:

  ```toml
  PUBLIC_ANALYTICS_PROVIDER = "ga4"
  PUBLIC_ANALYTICS_GA4_ID = "G-XXXXXXXXXX"
  ```

- [ ] **Admin → Data Streams → Web → Enhanced measurement → Page views → Advanced settings** altında
      hem page loads hem browser history page changes açık. Astro ClientRouter gezinmeleri böyle sayılır.
- [ ] Enhanced Measurement içindeki outbound click ve file download ölçümleri kapalı; şablon aynı
      etkileşimleri `outbound_click` ve `file_download` olarak gönderir.
- [ ] `contact_submit` gibi gerçek dönüşümler **Key event** olarak işaretlendi.
- [ ] `plan`, `cta`, `place`, `method`, `path` gibi raporda kullanılacak parametreler event-scoped custom
      dimension olarak kaydedildi. Parametre gönderilmiş olsa bile bu kayıt olmadan standart raporlarda
      kolayca boyut olarak kullanılamaz.

GA4 kullanmıyorsanız `PUBLIC_ANALYTICS_PROVIDER = ""` bırakın. `none`/boş durumda üçüncü parti
analytics script'i ve consent banner render edilmez.

## Olay envanteri

| Event               | Ne zaman gönderilir                                | Parametreler             | Başarı mı?                                     |
| ------------------- | -------------------------------------------------- | ------------------------ | ---------------------------------------------- |
| `hero_cta`          | Hero ana/ikincil buton tıklaması                   | `cta=primary\|secondary` | Hayır, tıklama                                 |
| `header_cta`        | Desktop/mobile header CTA tıklaması                | `place=desktop\|mobile`  | Hayır, tıklama                                 |
| `pricing_cta`       | Bir fiyat planı CTA tıklaması                      | `plan`                   | Hayır, tıklama                                 |
| `cta_section`       | Alt CTA bölümünün buton tıklaması                  | —                        | Hayır, tıklama                                 |
| `newsletter_submit` | Bülten submit butonuna tıklama                     | —                        | Yalnızca deneme; dış sağlayıcı sonucu bilinmez |
| `contact_submit`    | Seçilen sağlayıcı doğrulanmış başarı döndürdüğünde | —                        | Evet                                           |
| `contact_error`     | İletişim isteği/servisi hata verdiğinde            | —                        | Hata sinyali                                   |
| `outbound_click`    | İsimlendirilmemiş dış HTTP(S) link tıklaması       | `url`                    | Hayır, tıklama                                 |
| `file_download`     | Bilinen dosya uzantılı link tıklaması              | `path`                   | Hayır, tıklama                                 |
| `contact_click`     | İsimlendirilmemiş `mailto:`/`tel:` link tıklaması  | `method=email\|phone`    | Hayır, tıklama                                 |

Sayfa görüntülemeleri tabloda yoktur: Plausible History API'yi otomatik izler; GA4'te yukarıdaki
Enhanced Measurement ayarı bunu yapar.

## Yeni olay ekleme

`Button.astro` için bildirimsel API'yi kullanın:

```astro
<Button href="/demo" analytics={{ event: 'demo_cta', place: 'pricing' }}>Demo</Button>
```

Bir işlemin gerçek sonucunu bilen TypeScript kodunda doğrudan gönderin:

```ts
import { track } from '@/lib/analytics';
track('signup_complete', { plan: 'pro' });
```

- Event ve parametre adları sabit, küçük harfli `snake_case` olsun.
- E-posta, ad, telefon, serbest metin veya başka kişisel veri event/parametre olarak gönderilmez.
- Başarı event'i buton tıklamasında değil, başarılı servis yanıtından sonra atılır.
- Aynı öğeye hem açık `analytics={{…}}` adı verip hem otomatik link olayı beklemeyin; açık ad kazanır
  ve yalnızca tek event gönderilir.

## Canlı QA

- [ ] Consent kararı temiz bir tarayıcı profiliyle test edildi: reddetmede analytics isteği yok; kabulde
      script yükleniyor ve mevcut sayfanın ilk pageview'i geliyor.
- [ ] Ana sayfa → blog → iletişim client-side gezinmesinde her ekran için tam bir pageview var; iki veya
      daha fazla yok.
- [ ] Hero, header, pricing ve iletişim başarı akışları birer kez tetiklendi; Plausible realtime veya GA4
      Realtime/DebugView'da event adı ve parametreleri doğrulandı.
- [ ] Dış link ve dosya tıklaması birer kez görünüyor; sağlayıcının otomatik ölçümü nedeniyle çift kayıt yok.
- [ ] Network panelinde Plausible için siteye özel `pa-…js`, GA4 için doğru `G-…` kimliği yükleniyor;
      404, CSP veya ad-block kaynaklı hata ayrıca kaydedildi.
- [ ] Gizlilik metni seçilen sağlayıcıyı, consent davranışını ve saklama politikasını doğru anlatıyor.

Referanslar: [Plausible güncel snippet geçişi](https://plausible.io/docs/script-update-guide),
[Plausible custom events](https://plausible.io/docs/custom-event-goals),
[GA4 SPA pageviews](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications),
[GA4 events](https://developers.google.com/analytics/devguides/collection/ga4/events).
