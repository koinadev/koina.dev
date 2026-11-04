import { Add01Icon, Idea01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { projectStatuses, roles, type ProjectFilters, type ProjectStatus, type Role } from '@koina/shared/api';
import { useInfiniteQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { ProjectItem } from '@/components/ProjectItem';
import { BlockSkeleton, Button, ButtonLink, Chip, EmptyState, ErrorState, MoreButton } from '@/components/ui';
import { uniqueById } from '@/lib/format';
import { t } from '@/lib/i18n';
import { projectsQuery } from '@/lib/queries';
import { breadcrumbs, seo, webPage } from '@/lib/seo';
import { useRequireAuth } from '@/lib/session';

// Süzgeçler adreste duruyor: geri tuşu ve paylaşılan bağlantı aynı listeyi açar.
interface ExploreSearch {
  q?: string;
  durum?: ProjectStatus;
  arayan?: Role;
}

const toFilters = (s: ExploreSearch): ProjectFilters => ({ q: s.q, status: s.durum, role: s.arayan });

export const Route = createFileRoute('/kesfet/')({
  validateSearch: (s: Record<string, unknown>): ExploreSearch => ({
    ...(typeof s.q === 'string' && s.q.trim() ? { q: s.q.trim().slice(0, 60) } : {}),
    ...(projectStatuses.includes(s.durum as ProjectStatus) ? { durum: s.durum as ProjectStatus } : {}),
    ...(roles.includes(s.arayan as Role) ? { arayan: s.arayan as Role } : {}),
  }),
  loaderDeps: ({ search }) => toFilters(search),
  loader: ({ context, deps }) => context.queryClient.ensureInfiniteQueryData(projectsQuery(deps)).then(() => undefined),
  head: ({ match }) => {
    const appUrl = match.context.config.appUrl;
    return seo({
      appUrl,
      title: t.explore.title,
      description: t.explore.description,
      path: '/kesfet',
      jsonLd: [webPage(appUrl, t.explore.title, t.explore.description, '/kesfet'), breadcrumbs(appUrl, [{ name: t.explore.title, path: '/kesfet' }])],
    });
  },
  component: Explore,
});

function Explore() {
  const search = Route.useSearch();
  const filters = toFilters(search);
  const navigate = useNavigate({ from: '/kesfet/' });
  const setSearch = (next: ExploreSearch) => navigate({ search: next, replace: true });
  const [query, setQuery] = useState(search.q ?? '');
  const projects = useInfiniteQuery(projectsQuery(filters));
  const requireAuth = useRequireAuth();
  const newProject = () => requireAuth(() => navigate({ to: '/kesfet/yeni' }));

  // Yazarken her harfte istek atılmasın; çipler kendi değişikliklerini anında yazar.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const q = query.trim() || undefined;
      if (q !== search.q) setSearch({ ...search, q });
    }, 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const filtered = !!(search.q || search.durum || search.arayan);
  const items = uniqueById(projects.data?.pages.flatMap((p) => p.items) ?? []);

  return (
    <>
      <PageHeader
        title={t.explore.title}
        right={
          <Button size="sm" onClick={newProject}>
            <Icon icon={Add01Icon} size={18} />
            <span className="max-[359px]:sr-only">{t.explore.newProject}</span>
          </Button>
        }
      />
      <div className="space-y-3 border-b border-line px-4 pt-3 pb-3">
        <form role="search" onSubmit={(e) => e.preventDefault()}>
          <label className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-line bg-bg px-4 focus-within:border-primary-text">
            <Icon icon={Search01Icon} size={19} className="text-muted" />
            <span className="sr-only">{t.explore.searchLabel}</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.explore.search}
              maxLength={60}
              className="h-full min-w-0 flex-1 bg-transparent text-[0.9375rem] placeholder:text-muted focus:outline-none"
            />
          </label>
        </form>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.explore.status}>
          <Chip active={!search.durum} onClick={() => setSearch({ ...search, durum: undefined })}>
            {t.explore.all}
          </Chip>
          {projectStatuses.map((s) => (
            <Chip key={s} active={search.durum === s} onClick={() => setSearch({ ...search, durum: search.durum === s ? undefined : s })}>
              {t.status[s]}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-labelledby="role-filter">
          <span id="role-filter" className="mr-1 text-sm font-medium text-muted">
            {t.explore.lookingFor}
          </span>
          {roles.map((r) => (
            <Chip
              key={r}
              active={search.arayan === r}
              onClick={() => setSearch({ ...search, arayan: search.arayan === r ? undefined : r })}
              className="h-8 px-3 text-[0.8125rem]">
              {t.rolesPlural[r]}
            </Chip>
          ))}
        </div>
      </div>

      {projects.isPending ? (
        <BlockSkeleton count={4} className="h-24" />
      ) : projects.isError ? (
        <ErrorState error={projects.error} onRetry={() => projects.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Idea01Icon}
          text={filtered ? t.explore.empty : t.explore.emptyAll}
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
              <ButtonLink to="/kesfet/yeni" size="sm">
                {t.explore.newProject}
              </ButtonLink>
            )
          }
        />
      ) : (
        <div>
          {items.map((p) => (
            <ProjectItem key={p.id} project={p} />
          ))}
          <MoreButton query={projects} />
        </div>
      )}
    </>
  );
}
