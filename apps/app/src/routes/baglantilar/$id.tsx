import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { LinkMenu, VoteButton } from '@/components/LinkCard';
import { PageHeader } from '@/components/PageHeader';
import { Ago } from '@/components/PostItem';
import { btn } from '@/components/ui';
import { excerpt } from '@/lib/format';
import { isMissing } from '@/lib/guards';
import { formatDay, t } from '@/lib/i18n';
import { UGC_REL } from '@/lib/links';
import { linkQuery } from '@/lib/queries';
import { absolute, breadcrumbs, seo } from '@/lib/seo';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute('/baglantilar/$id')({
  loader: async ({ context, params }) => {
    if (!UUID.test(params.id)) throw notFound({ data: { text: t.links.notFound } });
    try {
      return await context.queryClient.ensureQueryData(linkQuery(params.id));
    } catch (err) {
      if (isMissing(err)) throw notFound({ data: { text: t.links.notFound } });
      throw err;
    }
  },
  head: ({ match, loaderData: link }) => {
    const appUrl = match.context.config.appUrl;
    const path = `/baglantilar/${match.params.id}`;
    if (!link) return seo({ appUrl, title: t.links.title, description: t.links.notFound, path, noindex: true });
    const description = excerpt(link.description || `${link.title} · ${link.host}`);
    return seo({
      appUrl,
      title: link.title,
      description,
      path,
      image: link.image,
      noindex: !!link.hidden,
      jsonLd: [
        {
          '@type': 'WebPage',
          name: link.title,
          description,
          url: absolute(appUrl, path),
          datePublished: link.createdAt,
          inLanguage: 'tr',
          keywords: link.tags.join(', '),
          about: { '@type': 'WebSite', name: link.siteName || link.host, url: link.url },
        },
        breadcrumbs(appUrl, [
          { name: t.links.title, path: '/baglantilar' },
          { name: link.title, path },
        ]),
      ],
    });
  },
  component: LinkDetail,
});

function LinkDetail() {
  const { id } = Route.useParams();
  const { data: link } = useSuspenseQuery(linkQuery(id));
  return (
    <>
      <PageHeader title={t.links.short} back="/baglantilar" right={<LinkMenu link={link} />} />
      <article className="px-4 py-5">
        {link.image && <img src={link.image} alt="" className="mb-4 aspect-[1.91] w-full rounded-2xl border border-line object-cover" />}
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="font-medium">{link.siteName || link.host}</span>
          <span>· {link.host}</span>
          <Link to="/baglantilar" search={{ kategori: link.category }} className="rounded-full bg-tint px-2.5 py-0.5 text-xs font-semibold text-on-tint hover:underline">
            {t.links.categories[link.category]}
          </Link>
        </p>
        <h2 className="mt-2 text-2xl leading-tight font-bold tracking-[-0.02em] break-anywhere">{link.title}</h2>
        {link.description && <p className="mt-3 text-[1.0625rem] leading-relaxed whitespace-pre-wrap break-anywhere">{link.description}</p>}
        {link.hidden && <p className="mt-3 rounded-xl bg-danger-bg px-3 py-2 text-sm">{t.feed.hidden}</p>}
        {link.tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {link.tags.map((tag) => (
              <li key={tag}>
                <Link to="/baglantilar" search={{ etiket: tag }} className="rounded-full border border-line px-2.5 py-0.5 text-sm font-medium text-muted hover:text-fg">
                  #{tag}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <a href={link.url} target="_blank" rel={UGC_REL} className={btn('primary')}>
            {t.links.open}
            <Icon icon={ArrowUpRight01Icon} size={17} />
          </a>
          <VoteButton link={link} />
        </div>
        <p className="mt-3 text-sm text-muted">{t.links.votes(link.votes)}</p>
        <div className="mt-6 flex items-center gap-3 border-t border-line pt-4">
          <Avatar name={link.author.name} handle={link.author.handle} size={36} />
          <p className="text-sm">
            <Link to="/u/$handle" params={{ handle: link.author.handle }} className="font-semibold hover:underline">
              {t.links.sharedBy(link.author.name)}
            </Link>
            <span className="block text-muted">
              <time dateTime={link.createdAt}>{formatDay(link.createdAt)}</time> · <Ago iso={link.createdAt} />
            </span>
          </p>
        </div>
      </article>
    </>
  );
}
