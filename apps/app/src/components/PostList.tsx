import { BubbleChatIcon } from '@hugeicons/core-free-icons';
import type { Page, Post } from '@koina/shared/api';
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { uniqueById } from '@/lib/format';
import { feedQuery, type FeedParams } from '@/lib/queries';
import { PostItem } from './PostItem';
import { EmptyState, ErrorState, MoreButton, PostSkeleton } from './ui';

/** Sayfalı gönderi listesi; sıralı akışta sayfalar kayarsa aynı gönderi iki kez görünmez. */
export function Posts({ data }: { data: InfiniteData<Page<Post>> }) {
  const posts = uniqueById(data.pages.flatMap((p) => p.items));
  return posts.map((post) => <PostItem key={post.id} post={post} />);
}

/** Akış, etiket, proje ve profil gönderileri: aynı liste, farklı süzgeç. SSR'da yükleyici veriyi önceden doldurur. */
export function PostList({ params, empty, emptyAction }: { params: FeedParams; empty: string; emptyAction?: ReactNode }) {
  const feed = useInfiniteQuery(feedQuery(params));
  if (feed.isPending) return <PostSkeleton count={4} />;
  if (feed.isError) return <ErrorState error={feed.error} onRetry={() => feed.refetch()} />;
  if (feed.data.pages[0]?.items.length === 0) return <EmptyState icon={BubbleChatIcon} text={empty} action={emptyAction} />;
  return (
    <div>
      <Posts data={feed.data} />
      <MoreButton query={feed} />
    </div>
  );
}
