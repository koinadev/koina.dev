import { glob } from 'astro/loaders';
import type { Loader } from 'astro/loaders';

/**
 * Blog koleksiyonunun loader'ı: YEREL markdown + (opsiyonel) UZAK kaynak, TEK koleksiyon.
 *
 * İki ayrı koleksiyon KURULMADI. Sebep: sayfalar, RSS ve OG üretimi `getCollection('blog')`
 * üzerinden tek liste okur; ikinci koleksiyon her tüketiciye "iki kaynağı birleştir + sırala"
 * yükü bindirirdi ve `translationKey` eşleşmesi kaynak sınırını geçemezdi (uzak TR yazısı yerel
 * EN yazısıyla eşleşmeliyken eşleşmezdi).
 *
 * Uzak girdiler yerelle AYNI id şemasını (`<locale>/<slug>`) kullanır; bu yüzden aşağı akıştaki
 * hiçbir kod bir yazının nereden geldiğini bilmek zorunda değildir.
 */
export interface BlogLoaderOptions {
  /** Yerel markdown'ın kökü — repo kökündeki `content/blog`. */
  base: string;
  /**
   * Uzak kaynağın JSON endpoint'i. BOŞSA uzak kod yolu hiç çalışmaz: tek `fetch` atılmaz, modül
   * yan etkisi yoktur. Şablonun çoğu projesinde bu değer boş kalacağı için varsayılan davranış
   * "yalnızca yerel markdown"dır.
   */
}

// Parametre BİLEREK destructure EDİLMİYOR. `remoteEndpoint` alanı `@feature:blog-remote`
// marker'lıdır; süpürme satırı silince destructuring'de sahipsiz bir isim kalır ve tip hatası
// üretirdi. `options.` üzerinden okumak, marker'lı satırın tek başına silinebilmesini sağlar.
export function blogLoader(options: BlogLoaderOptions): Loader {
  const local = glob({ pattern: '**/*.md', base: options.base });

  return {
    name: 'blog-loader',
    load: async (context) => {
      // YEREL ÖNCE: uzak girdiler yalnızca boşluk doldurur, asla yereli ezmez (bkz. blog-remote.ts
      // içindeki `store.has` kontrolü). Repo'daki markdown her zaman tek doğruluk kaynağıdır.
      await local.load(context);
    },
  };
}
