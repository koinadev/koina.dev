import { t } from './i18n';

export const SITE_NAME = 'koina.dev';
export const DEFAULT_IMAGE = '/og.png';

export interface SeoInput {
  appUrl: string;
  title: string;
  description: string;
  /** Kökten yol (`/akis/…`); kanonik adres ve og:url. Sorgu dizgisi bilerek yok. */
  path: string;
  image?: string | null;
  imageAlt?: string;
  type?: 'website' | 'article' | 'profile';
  /** Profiller, giriş ve kişisel sayfalar dizine girmez. */
  noindex?: boolean;
  jsonLd?: Record<string, unknown>[];
}

/** JSON-LD `<script>` içinde: `</script>` ve HTML yorumları kaçırılır ki kullanıcı metni betik bloğunu kapatamasın. */
export const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

export const absolute = (appUrl: string, pathOrUrl: string) => (/^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${appUrl}${pathOrUrl}`);

/** Sayfanın `<head>`'i: başlık, açıklama, kanonik, Open Graph, Twitter ve yapılandırılmış veri. */
export function seo(input: SeoInput) {
  const url = absolute(input.appUrl, input.path);
  const title = input.path === '/home' ? `${SITE_NAME}: ${input.title}` : `${input.title} · ${SITE_NAME}`;
  const image = absolute(input.appUrl, input.image || DEFAULT_IMAGE);
  const meta = [
    { title },
    { name: 'description', content: input.description },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:locale', content: 'tr_TR' },
    { property: 'og:type', content: input.type ?? 'website' },
    { property: 'og:title', content: input.title },
    { property: 'og:description', content: input.description },
    { property: 'og:url', content: url },
    { property: 'og:image', content: image },
    { property: 'og:image:alt', content: input.imageAlt || SITE_NAME },
    { name: 'twitter:card', content: input.image ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: input.title },
    { name: 'twitter:description', content: input.description },
    { name: 'twitter:image', content: image },
    { name: 'robots', content: input.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large' },
  ];
  return {
    meta,
    links: input.noindex ? [] : [{ rel: 'canonical', href: url }],
    scripts: (input.jsonLd ?? []).map((data) => ({ type: 'application/ld+json', children: safeJson({ '@context': 'https://schema.org', ...data }) })),
  };
}

/** Ekmek kırıntısı: ana sayfa → bölüm → sayfa. */
export function breadcrumbs(appUrl: string, items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: t.nav.home, path: '/home' }, ...items].map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absolute(appUrl, item.path),
    })),
  };
}

export const webPage = (appUrl: string, name: string, description: string, path: string) => ({
  '@type': 'WebPage',
  name,
  description,
  url: absolute(appUrl, path),
  inLanguage: 'tr',
  isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: appUrl },
});
