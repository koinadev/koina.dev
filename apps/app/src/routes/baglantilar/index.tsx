import { Add01Icon, Cancel01Icon, Link04Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { linkCategories, type LinkCategory } from '@koina/shared/api';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { LinkCard } from '@/components/LinkCard';
import { PageHeader, Tabs } from '@/components/PageHeader';
import { BlockSkeleton, Button, ButtonLink, Chip, EmptyState, ErrorState, MoreButton } from '@/components/ui';
import { uniqueById } from '@/lib/format';
import { t } from '@/lib/i18n';
import { linksQuery, linkTagsQuery, type LinkParams } from '@/lib/queries';
import { breadcrumbs, seo, webPage } from '@/lib/seo';
import { useRequireAuth } from '@/lib/session';

interface LinksSearch {
  sirala?: 'yeni';
  kategori?: LinkCategory;
  etiket?: string;
  q?: string;
}

const toParams = (s: LinksSearch): LinkParams => ({ sort: s.sirala === 'yeni' ? 'new' : 'top', category: s.kategori, tag: s.etiket, q: s.q });

export const Route = createFileRoute('/baglantilar/')({
  validateSearch: (s: Record<string, unknown>): LinksSearch => ({
    ...(s.sirala === 'yeni' ? { sirala: 'yeni' as const } : {}),
    ...(linkCategories.includes(s.kategori as LinkCategory) ? { kategori: s.kategori as LinkCategory } : {}),
    ...(typeof s.etiket === 'string' && s.etiket.trim() ? { etiket: s.etiket.trim().slice(0, 30) } : {}),
    ...(typeof s.q === 'string' && s.q.trim() ? { q: s.q.trim().slice(0, 80) } : {}),
  }),
  loaderDeps: ({ search }) => toParams(search),
  loader: async ({ context, deps }) => {
    await Promise.all([context.queryClient.ensureInfiniteQueryData(linksQuery(deps)), context.queryClient.ensureQueryData(linkTagsQuery)]);
  },
  head: ({ match }) => {
    const appUrl = match.context.config.appUrl;
    return seo({
      appUrl,
      title: t.links.title,
      description: t.links.description,
      path: '/baglantilar',
      jsonLd: [webPage(appUrl, t.links.title, t.links.description, '/baglantilar'), breadcrumbs(appUrl, [{ name: t.links.title, path: '/baglantilar' }])],
    });
  },
  component: LinksPage,
});

function LinksPage() {
  const search = Route.useSearch();
  const params = toParams(search);
  const navigate = useNavigate({ from: '/baglantilar/' });
  const setSearch = (next: LinksSearch) => navigate({ search: next, replace: true });
  const links = useInfiniteQuery(linksQuery(params));
  const tags = useQuery(linkTagsQuery);
  const requireAuth = useRequireAuth();
  const [query, setQuery] = useState(search.q ?? '');

  useEffect(() => {
    const id = window.setTimeout(() => {
      const q = query.trim() || undefined;
      if (q !== search.q) setSearch({ ...search, q });
    }, 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const items = uniqueById(links.data?.pages.flatMap((p) => p.items) ?? []);
  const filtered = !!(search.kategori || search.etiket || search.q);

  return (
    <>
      <PageHeader
        title={t.links.title}
        right={
          <Button size="sm" onClick={() => requireAuth(() => navigate({ to: '/baglantilar/yeni' }))}>
            <Icon icon={Add01Icon} size={18} />
            <span className="max-[359px]:sr-only">{t.links.add}</span>
          </Button>
        }>
        <Tabs
          label={t.links.title}
          value={search.sirala === 'yeni' ? 'new' : 'top'}
          onChange={(v) => setSearch({ ...search, sirala: v === 'new' ? 'yeni' : undefined })}
          options={[
            { value: 'top', label: t.links.sort.top },
            { value: 'new', label: t.links.sort.new },
          ]}
        />
      </PageHeader>
      <div className="space-y-3 border-b border-line px-4 pt-3 pb-3">
        <p className="text-[0.9375rem] text-muted">{t.links.lead}</p>
        <form role="search" onSubmit={(e) => e.preventDefault()}>
          <label className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-line bg-bg px-4 focus-within:border-primary-text">
            <Icon icon={Search01Icon} size={19} className="text-muted" />
            <span className="sr-only">{t.links.search}</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.links.search}
              maxLength={80}
              className="h-full min-w-0 flex-1 bg-transparent text-[0.9375rem] placeholder:text-muted focus:outline-none"
            />
          </label>
        </form>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]" role="group" aria-label={t.links.categoryLabel}>
          <Chip active={!search.kategori} onClick={() => setSearch({ ...search, kategori: undefined })}>
            {t.links.all}
          </Chip>
          {linkCategories.map((c) => (
            <Chip key={c} active={search.kategori === c} onClick={() => setSearch({ ...search, kategori: search.kategori === c ? undefined : c })}>
              {t.links.categories[c]}
            </Chip>
          ))}
        </div>
        {search.etiket ? (
          <Chip active onClick={() => setSearch({ ...search, etiket: undefined })} aria-label={t.links.clearTag}>
            {t.links.tagFilter(search.etiket)}
            <Icon icon={Cancel01Icon} size={14} />
          </Chip>
        ) : (
          (tags.data?.items.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.links.tagsLabel}>
              {tags.data!.items.slice(0, 10).map((tg) => (
                <button
                  key={tg.tag}
                  type="button"
                  onClick={() => setSearch({ ...search, etiket: tg.tag })}
                  className="rounded-full border border-line px-2.5 py-0.5 text-[0.8125rem] font-medium text-muted hover:border-fg/40 hover:text-fg">
                  #{tg.tag}
                </button>
              ))}
            </div>
          )
        )}
      </div>
      {links.isPending ? (
        <BlockSkeleton count={4} className="h-24" />
      ) : links.isError ? (
        <ErrorState error={links.error} onRetry={() => links.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Link04Icon}
          text={filtered ? t.links.empty : t.links.emptyAll}
          action={
            filtered ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery('');
                  setSearch({});
                }}>
                {t.explore.clear}
              </Button>
            ) : (
              <ButtonLink to="/baglantilar/yeni" size="sm">
                {t.links.add}
              </ButtonLink>
            )
          }
        />
      ) : (
        <div>
          {items.map((l) => (
            <LinkCard key={l.id} link={l} />
          ))}
          <MoreButton query={links} />
        </div>
      )}
    </>
  );
}
