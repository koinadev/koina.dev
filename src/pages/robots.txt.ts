import type { APIRoute } from 'astro';
import { siteConfig } from '@/config/site.config';

// `public/robots.txt` OLARAK DURAMAZ: `public/` birebir kopyalanır, şablonlanmaz — dosyadaki
// `Sitemap:` satırı sabit kalırdı ve bu şablondan türeyen HER site kendi sitemap'i yerine
// `example.com`inkini ilan ederdi. Sessiz bir hata: build yeşil, Search Console sitemap'i bulamaz.
// Endpoint olarak `PUBLIC_SITE_URL`den üretiliyor; `output: 'static'` altında build sırasında
// bir kez çalışıp `dist/robots.txt` olarak yazılır (çalışma zamanı maliyeti yok).
export const GET: APIRoute = ({ site }) => {
  // `site` astro.config'teki `site` alanıdır; sitemap entegrasyonu da onu zorunlu kılar. Yine de
  // siteConfig'e düşüyoruz ki bu dosya tek başına okunduğunda kaynağı belirsiz kalmasın.
  const base = site ?? new URL(siteConfig.url);
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    // @astrojs/sitemap birden fazla sitemap üretebildiği için İNDEKS dosyasını ilan ediyoruz;
    // tek sayfalık sitede de aynı dosya adı üretilir.
    `Sitemap: ${new URL('sitemap-index.xml', base).href}`,
    // Sayfa markdown ikizleri için standart bir robots.txt alanı YOK; yorum satırı bilerek
    // seçildi — uydurma bir alan ayrıştırıcılar tarafından sessizce atılırdı, oysa bu dosyayı
    // ham metin olarak okuyan LLM kazıyıcıları yorumu da görür. Adres kalıbı GÖRELİ: kural tek
    // bir sayfaya değil, sitedeki HER sayfaya uygulanıyor.
    '# Sayfa markdown ikizi: sayfa adresinin sonuna `.md` ekleyin — /blog → /blog.md',
    '',
  ].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
