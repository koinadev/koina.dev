# SEO yayına alma checklist'i

Bu liste kodun otomatik ürettiği SEO yüzeyi ile sizin panel/DNS tarafında yapmanız gerekenleri
ayırır. Her yeni projede ve canonical alan adı değiştiğinde yeniden tamamlayın.

## 1. Build öncesi yapılandırma

- [ ] `wrangler.toml` içindeki `PUBLIC_SITE_URL` yalnızca gerçek canonical origin'dir
      (`https://example.com`; path ve sonda `/` yok).
- [ ] Apex (`example.com`) veya `www` (`www.example.com`) varyantlarından biri canonical seçildi.
      Cloudflare'da diğer varyanttan canonical host'a kalıcı yönlendirme var; HTTP de HTTPS'e gider.
- [ ] `PUBLIC_SITE_NAME`, `PUBLIC_SITE_LOGO`, iletişim adresi ve kullanılan sosyal profil URL'leri
      gerçek değerlerdir. Kullanılmayan sosyal alanlar boş bırakılır; JSON-LD'ye boş URL yazılmaz.
- [ ] `rg -n "example\\.com|YOUR-|TODO" wrangler.toml src content public docs` çıktısındaki her
      üretim placeholder'ı bilinçli olarak kapatıldı.
- [ ] Her blog yazısında benzersiz `title`, `description`, doğru `date`, gerekiyorsa `updated`,
      açıklayıcı `coverAlt` ve çevirileri eşleyen benzersiz `translationKey` var.

## 2. Yerel build doğrulaması

```bash
bun run check
bun run test
bun run build
```

- [ ] `dist/robots.txt` içindeki `Sitemap:` gerçek host'taki `/sitemap-index.xml` adresidir.
- [ ] `dist/sitemap-index.xml` ve alt sitemap'teki bütün `<loc>` URL'leri gerçek canonical host'tadır;
      `/` dil algılama stub'ı sitemap'te yoktur.
- [ ] TR/EN ana sayfa, iletişim, gizlilik, blog listesi ve birer blog yazısında canonical tektir ve
      kendi URL'sini gösterir.
- [ ] Çevirisi bulunan sayfalarda `tr`, `en` ve `x-default` hreflang URL'leri 200 dönen karşılıklara
      gider. Lokalize blog slug'larında dil segmenti iki kez tekrarlanmaz.
- [ ] Blog yazısında `og:type=article`, mutlak 1200×630 OG image, yayın tarihi, `BlogPosting` ve
      `BreadcrumbList` JSON-LD bulunur.
- [ ] Organization JSON-LD'de gerçek `name`, `url`, mutlak `logo` vardır; `sameAs` içinde boş dize yoktur.
- [ ] Kök `/` yalnızca i18n yönlendirme stub'ıysa `noindex`; gerçek dil sayfaları indexlenebilirdir.

## 3. Google Search Console

- [ ] Search Console'da **Domain property** eklendi ve DNS TXT kaydıyla doğrulandı. Domain property
      tüm protokol ve subdomain varyantlarını kapsadığı için varsayılan tercihtir.
- [ ] DNS doğrulaması mümkün değilse canonical origin için **URL-prefix property** eklendi. Google'ın
      verdiği meta etiketinin yalnızca `content` değeri `PUBLIC_SEO_VERIFICATION_GOOGLE` alanına
      yazıldı, yeniden deploy edildi ve ardından **Verify** çalıştırıldı. DNS kullanılıyorsa env boş kalır.
- [ ] Sitemaps bölümüne yalnızca `sitemap-index.xml` gönderildi ve durum **Success** oldu.
- [ ] URL Inspection ile ana sayfa, iletişim sayfası ve bir blog yazısında **Test live URL** çalıştırıldı;
      seçilen canonical ve indexlenebilirlik beklenen değerlerle eşleşti.
- [ ] Yeni/önemli sayfalarda gerekirse **Request indexing** kullanıldı. Bu, sitemap'in yerini almaz.
- [ ] Bir blog yazısı Google Rich Results Test'te Article/Breadcrumb hatası vermiyor. Uyarılar da
      bilinçli olarak değerlendirildi; yalnızca “0 error” görmekle yetinilmedi.

## 4. Bing ve diğer arama motorları

- [ ] Bing Webmaster Tools'a site Google Search Console'dan içe aktarıldı veya mülk eklendi.
- [ ] Meta doğrulama seçildiyse Bing'in verdiği değerin yalnızca `content` kısmı
      `PUBLIC_SEO_VERIFICATION_BING` alanına yazıldı, deploy sonrası doğrulandı.
- [ ] Bing'e de `sitemap-index.xml` gönderildi.

## 5. Canlı sonrası gözlem

- [ ] İlk deploy'dan sonra gerçek URL'lerde 200/301 zinciri kontrol edildi; redirect loop ve çok adımlı
      yönlendirme yok.
- [ ] Search Console Pages/Indexing raporu ilk hafta ve sonrasında haftalık kontrol edildi. “Duplicate,
      Google chose different canonical”, “Crawled - currently not indexed” ve 404 artışları incelendi.
- [ ] Core Web Vitals ve HTTPS raporları veri oluşunca kontrol edildi.
- [ ] Alan adı, URL yapısı veya slug değişirse 301 eşlemesi, sitemap, canonical, hreflang ve analytics
      birlikte yeniden doğrulanır.

Referanslar: [Search Console property türleri ve doğrulama](https://support.google.com/webmasters/answer/34592),
[URL Inspection](https://support.google.com/webmasters/answer/12482179),
[Google Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article).
