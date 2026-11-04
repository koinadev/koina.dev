import { useInfiniteQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/PageHeader';
import { PostList } from '@/components/PostList';
import { ProjectMini } from '@/components/ProjectItem';
import { SectionTitle } from '@/components/ui';
import { SearchBox } from '@/components/Widgets';
import { t } from '@/lib/i18n';
import { feedQuery, projectsQuery } from '@/lib/queries';
import { seo } from '@/lib/seo';

export const Route = createFileRoute('/ara')({
  validateSearch: (s: Record<string, unknown>): { q?: string } => (typeof s.q === 'string' && s.q.trim() ? { q: s.q.trim().slice(0, 80) } : {}),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: async ({ context, deps }) => {
    if (!deps.q) return;
    await Promise.all([
      context.queryClient.ensureInfiniteQueryData(feedQuery({ q: deps.q })),
      context.queryClient.ensureInfiniteQueryData(projectsQuery({ q: deps.q })),
    ]);
  },
  // Arama sonuçları dizine girmez: sonsuz sayıda ince sayfa üretir.
  head: ({ match }) => seo({ appUrl: match.context.config.appUrl, title: t.search.title, description: t.search.lead, path: '/ara', noindex: true }),
  component: SearchPage,
});

function ProjectHits({ q }: { q: string }) {
  const projects = useInfiniteQuery(projectsQuery({ q }));
  const items = projects.data?.pages[0]?.items.slice(0, 3) ?? [];
  if (!items.length) return null;
  return (
    <section aria-labelledby="search-projects" className="border-b border-line pb-2">
      <SectionTitle id="search-projects">{t.search.projects}</SectionTitle>
      {items.map((p) => (
        <ProjectMini key={p.id} project={p} />
      ))}
    </section>
  );
}

function SearchPage() {
  const { q } = Route.useSearch();
  return (
    <>
      <PageHeader title={t.search.title} back="/home" />
      <div className="border-b border-line px-4 py-3">
        <SearchBox key={q} initial={q ?? ''} autoFocus={!q} />
      </div>
      {q ? (
        <>
          <ProjectHits q={q} />
          <SectionTitle>{t.search.posts}</SectionTitle>
          <div className="border-t border-line">
            <PostList key={q} params={{ q }} empty={t.feed.emptySearch} />
          </div>
        </>
      ) : (
        <p className="px-4 py-6 text-[0.9375rem] text-muted">{t.search.lead}</p>
      )}
    </>
  );
}
