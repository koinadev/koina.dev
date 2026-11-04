import { BookOpen01Icon } from '@hugeicons/core-free-icons';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { PageHeader } from '@/components/PageHeader';
import { BlockSkeleton, EmptyState, ErrorState } from '@/components/ui';
import { formatDay, t } from '@/lib/i18n';
import { blogQuery } from '@/lib/queries';
import { absolute, breadcrumbs, seo } from '@/lib/seo';

export const Route = createFileRoute('/yazilar/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(blogQuery),
  head: ({ match, loaderData }) => {
    const appUrl = match.context.config.appUrl;
    return seo({
      appUrl,
      title: t.blog.title,
      description: t.blog.description,
      path: '/yazilar',
      jsonLd: [
        {
          '@type': 'Blog',
          name: `${t.blog.title} · koina.dev`,
          description: t.blog.description,
          url: absolute(appUrl, '/yazilar'),
          inLanguage: 'tr',
          blogPost: (loaderData ?? []).slice(0, 20).map((p) => ({
            '@type': 'BlogPosting',
            headline: p.title,
            datePublished: p.date,
            url: absolute(appUrl, `/yazilar/${p.slug}`),
          })),
        },
        breadcrumbs(appUrl, [{ name: t.blog.title, path: '/yazilar' }]),
      ],
    });
  },
  component: Blog,
});

function Blog() {
  const blog = useQuery(blogQuery);
  return (
    <>
      <PageHeader title={t.blog.title} />
      <p className="border-b border-line px-4 py-4 text-[0.9375rem] text-muted">{t.blog.lead}</p>
      {blog.isPending ? (
        <BlockSkeleton count={3} className="h-32" />
      ) : blog.isError || blog.data === null ? (
        <ErrorState error={blog.error ?? { code: 'NETWORK' }} onRetry={() => blog.refetch()} />
      ) : blog.data.length === 0 ? (
        <EmptyState icon={BookOpen01Icon} text={t.blog.empty} />
      ) : (
        <ul>
          {blog.data.map((post, i) => (
            <li key={post.slug} className="border-b border-line">
              <Link to="/yazilar/$slug" params={{ slug: post.slug }} className="group block px-4 py-5 transition-colors hover:bg-bg/70">
                {/* En yeni yazı kapağıyla büyük; kalanlar yazı listesi gibi sade. */}
                {i === 0 && post.cover && <img src={post.cover} alt="" className="mb-4 aspect-[1.9] w-full rounded-2xl border border-line object-cover" />}
                <p className="text-[0.8125rem] text-muted">
                  <time dateTime={post.date}>{formatDay(post.date)}</time> · {t.blog.minutes(post.minutes)}
                </p>
                <h2 className={`mt-1 font-bold tracking-[-0.02em] group-hover:underline ${i === 0 ? 'text-2xl leading-tight' : 'text-lg leading-snug'}`}>{post.title}</h2>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-fg/80">{post.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
