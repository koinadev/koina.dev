import type { Page, Post } from '@koina/shared/api';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { errorText, t } from '@/lib/i18n';
import { flatten } from '@/lib/queries';
import { colors } from '@/lib/theme';
import { Empty, ErrorNote, Loading } from './misc';
import { PostItem } from './post-item';
import type { IconName } from './icon';

/**
 * Sonsuz gönderi listesi: sona yaklaşınca sonraki sayfa gelir, aşağı çekince yenilenir. Akış, etiket ve kaydedilenler
 * ekranları aynı listeyi kullanır.
 */
export function PostList({ query, header, empty, emptyIcon = 'BubbleChatIcon', bottomPad = 40 }: {
  query: UseInfiniteQueryResult<InfiniteData<Page<Post>>>;
  header?: ReactElement;
  empty: string;
  emptyIcon?: IconName;
  bottomPad?: number;
}) {
  const insets = useSafeAreaInsets();
  const posts = flatten(query.data);
  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      data={posts}
      keyExtractor={(p) => p.id}
      renderItem={({ item, index }) => <PostItem post={item} last={index === posts.length - 1} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <View style={{ padding: 16 }}>
            <ErrorNote text={errorText(query.error)} retryLabel={t.common.retry} onRetry={() => query.refetch()} />
          </View>
        ) : (
          <Empty icon={emptyIcon} text={empty} />
        )
      }
      ListFooterComponent={
        query.isFetchingNextPage ? (
          <View style={{ padding: 20 }}>
            <ActivityIndicator color={colors.primaryText} />
          </View>
        ) : undefined
      }
      onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
      onEndReachedThreshold={0.6}
      refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()} />}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingBottom: insets.bottom + bottomPad, maxWidth: 720, width: '100%', alignSelf: 'center' }}
    />
  );
}
