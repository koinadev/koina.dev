import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { siteConfig, blogFeedTitle } from '@/config/site.config';
import { blogPostPath, routePath, blogSlugFromId } from '@/i18n/routes';
import { getMessages } from '@/messages';

// Tanım siteConfig'ten değil mesaj paketinden gelir: dilden bağımsız tek değer olmasın diye.
const { blog } = getMessages('en');

export const GET: APIRoute = async (context) => {
  const posts = await getCollection('blog', ({ data }) => data.locale === 'en');
  return rss({
    title: blogFeedTitle,
    description: blog.rssDescription,
    // `context.site` sitenin köküdür (dil algılama stub'ı) — kanalın gerçek `<link>`i blog kökü.
    site: new URL(routePath('blog', 'en'), context.site ?? siteConfig.url).href,
    // Paket varsayılanı adreslerin sonuna `/` ekler; site adresleri slash'sız (astro.config.mjs).
    trailingSlash: false,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: blogPostPath(blogSlugFromId(post.id, 'en'), 'en'),
    })),
  });
};
