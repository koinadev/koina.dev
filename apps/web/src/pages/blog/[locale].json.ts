import { getCollection } from 'astro:content';
import { getImage } from 'astro:assets';
import type { APIRoute, GetStaticPaths } from 'astro';
import type { BlogFeed, BlogPost } from '@koina/shared/api';
import { blogPostPath, blogSlugFromId } from '@/i18n/routes';
import { readingTime } from '@/lib/utils';
import type { Locale } from '@/i18n/utils';

// Mobil ve web uygulamasının okuduğu blog beslemesi: `/blog/tr.json`, `/blog/en.json`.
// Yollar (`url`, `cover`) bilerek GÖRELİ: site henüz kendi alan adında değil, istemci beslemeyi
// hangi kökten çektiyse adresleri o köke göre çözer.
export const getStaticPaths = (() => [
  { params: { locale: 'tr' } },
  { params: { locale: 'en' } },
]) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const locale = params.locale as Locale;
  const entries = (await getCollection('blog', ({ data }) => data.locale === locale)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );
  const posts = await Promise.all(
    entries.map(async (entry): Promise<BlogPost> => {
      const { cover } = entry.data;
      const coverSrc = !cover
        ? null
        : typeof cover === 'string'
          ? cover
          : (await getImage({ src: cover, width: 1200, format: 'webp' })).src;
      return {
        slug: blogSlugFromId(entry.id, locale),
        title: entry.data.title,
        description: entry.data.description,
        date: entry.data.date.toISOString(),
        updated: entry.data.updated?.toISOString() ?? null,
        author: entry.data.author ?? null,
        url: blogPostPath(blogSlugFromId(entry.id, locale), locale),
        cover: coverSrc,
        coverAlt: entry.data.coverAlt ?? '',
        minutes: readingTime(entry.body ?? ''),
        body: entry.body ?? '',
      };
    }),
  );
  const feed: BlogFeed = { locale, posts };
  return new Response(JSON.stringify(feed), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Web uygulaması başka bir kökten okur.
      'access-control-allow-origin': '*',
    },
  });
};
