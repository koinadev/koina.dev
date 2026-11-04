import { Bookmark02Icon } from '@hugeicons/core-free-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/PageHeader';
import { Posts } from '@/components/PostList';
import { EmptyState, ErrorState, MoreButton, PostSkeleton } from '@/components/ui';
import { requireMe } from '@/lib/guards';
import { t } from '@/lib/i18n';
import { bookmarksQuery } from '@/lib/queries';
import { seo } from '@/lib/seo';

export const Route = createFileRoute('/kaydedilenler')({
  beforeLoad: requireMe,
  loader: ({ context }) => context.queryClient.ensureInfiniteQueryData(bookmarksQuery).then(() => undefined),
  head: ({ match }) => seo({ appUrl: match.context.config.appUrl, title: t.bookmarks.title, description: t.bookmarks.empty, path: '/kaydedilenler', noindex: true }),
  component: Bookmarks,
});

function Bookmarks() {
  const list = useInfiniteQuery(bookmarksQuery);
  return (
    <>
      <PageHeader title={t.bookmarks.title} />
      {list.isPending ? (
        <PostSkeleton count={3} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.data.pages[0]?.items.length === 0 ? (
        <EmptyState icon={Bookmark02Icon} text={t.bookmarks.empty} />
      ) : (
        <div>
          <Posts data={list.data} />
          <MoreButton query={list} />
        </div>
      )}
    </>
  );
}
