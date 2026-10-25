import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { blogLoader } from './loaders/blog';
import { siteConfig } from './config/site.config';

const blog = defineCollection({
  // İçerik `src/` DIŞINDA, repo kökündeki `content/` altında durur. Ayrılmasının sebebi:
  // `content/` bir KAYNAKtır, kod değil — bir CMS senkronu, ayrı bir içerik repo'su ya da
  // teknik olmayan bir editör oraya `src/` içine hiç girmeden dokunabilsin diye.
  // Yerleşim page-bundle'dır: `content/blog/<locale>/<slug>/index.md` + görselleri yanında.
  // `index` son eki id'den DÜŞÜRÜLÜR (astro/dist/content/utils.js), yani id yine `<locale>/<slug>`.
  loader: blogLoader({
    base: './content/blog',
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      // Son güncelleme. OPSİYONEL ve varsayılanı YOK: `date`e eşitlenseydi her yazı "güncellendi"
      // sinyali verirdi ve `dateModified` anlamını yitirirdi (Google tazelik sinyali olarak okur).
      updated: z.coerce.date().optional(),
      // Yazar adı. Boşsa Article JSON-LD'de yazar olarak Organization kullanılır — `author`
      // alanının tamamen atlanması yapılandırılmış veri uyarısı üretir.
      author: z.string().optional(),
      locale: z.enum(['tr', 'en']).default('tr'),
      // Diller arası eşleme anahtarı: slug'lar lokalize olduğu için `tr/hosgeldiniz` ile
      // `en/welcome` yalnızca bu ortak değer üzerinden eşleşebilir (dil değiştirici + hreflang).
      translationKey: z.string(), // @feature:i18n
      // BİRLEŞİM ŞART: `image()` yalnızca build anında bilinen YEREL dosyaları çözer ve optimize
      // eder; uzak kaynaktan gelen bir yazının cover'ı ise mutlak URL'dir. Tek tip seçilseydi ya
      // yerelde optimizasyon kaybedilirdi ya da uzak yazılar şemadan geçemezdi.
      cover: z.union([image(), z.url()]).optional(),
      coverAlt: z.string().optional(),
    }),
});

export const collections = { blog };
