import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { btn, ErrorState } from '@/components/ui';
import { formatDay, t } from '@/lib/i18n';
import { blogPostQuery } from '@/lib/queries';
import { absolute, breadcrumbs, seo } from '@/lib/seo';

export const Route = createFileRoute('/yazilar/$slug')({
  loader: async ({ context, params }) => {
    const res = await context.queryClient.ensureQueryData(blogPostQuery(params.slug));
    if (res.status === 'missing') throw notFound({ data: { text: t.blog.notFound } });
    return res;
  },
  head: ({ match, loaderData }) => {
    const appUrl = match.context.config.appUrl;
    const path = `/yazilar/${match.params.slug}`;
    if (loaderData?.status !== 'ok') return seo({ appUrl, title: t.blog.title, description: t.blog.description, path, noindex: true });
    const p = loaderData.post;
    return seo({
      appUrl,
      title: p.title,
      description: p.description,
      path,
      type: 'article',
      image: p.cover,
      imageAlt: p.coverAlt,
      jsonLd: [
        {
          '@type': 'BlogPosting',
          headline: p.title,
          description: p.description,
          datePublished: p.date,
          ...(p.updated ? { dateModified: p.updated } : {}),
          ...(p.cover ? { image: p.cover } : {}),
          author: { '@type': p.author ? 'Person' : 'Organization', name: p.author ?? 'koina.dev' },
          url: absolute(appUrl, path),
          // Yazının asıl yeri tanıtım sitesi; burası onun uygulama içi kopyası.
          isBasedOn: p.url,
          inLanguage: 'tr',
        },
        breadcrumbs(appUrl, [
          { name: t.blog.title, path: '/yazilar' },
          { name: p.title, path },
        ]),
      ],
    });
  },
  component: BlogPost,
});

function BlogPost() {
  const { slug } = Route.useParams();
  const { data, refetch } = useSuspenseQuery(blogPostQuery(slug));
  return (
    <>
      <PageHeader title={t.blog.title} back="/yazilar" />
      {data.status !== 'ok' ? (
        <ErrorState error={{ code: 'NETWORK' }} onRetry={() => refetch()} />
      ) : (
        <article className="px-4 pt-5 pb-10 sm:px-6">
          <p className="text-sm text-muted">
            <time dateTime={data.post.date}>{formatDay(data.post.date)}</time> · {t.blog.minutes(data.post.minutes)}
            {data.post.author && <> · {data.post.author}</>}
          </p>
          <h2 className="mt-2 text-[2rem] leading-[1.15] font-bold tracking-[-0.03em] text-balance">{data.post.title}</h2>
          <p className="mt-3 text-lg leading-relaxed text-muted">{data.post.description}</p>
          {data.post.cover && <img src={data.post.cover} alt={data.post.coverAlt} className="mt-6 aspect-[1.9] w-full rounded-2xl border border-line object-cover" />}
          {/* Markdown sitenin kendi içerik klasöründen (kullanıcı içeriği değil); sunucuda HTML'e çevrildi. */}
          <div className="prose-koina mt-8" dangerouslySetInnerHTML={{ __html: data.html }} />
          <div className="mt-10 border-t border-line pt-5">
            <a href={data.post.url} className={btn('outline', 'sm')}>
              {t.blog.openOnSite}
              <Icon icon={ArrowUpRight01Icon} size={16} />
            </a>
          </div>
        </article>
      )}
    </>
  );
}
