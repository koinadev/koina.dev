import type { Notification, NotificationKind } from '@koina/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/icon';
import { Avatar, Empty, ErrorNote, Loading } from '@/components/misc';
import { Text } from '@/components/text';
import { errorText, t, timeAgo } from '@/lib/i18n';
import { flatten, useMarkRead, useNotifications } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { colors, font } from '@/lib/theme';

const icons: Record<NotificationKind, IconName> = {
  reply: 'Comment01Icon',
  mention: 'AtIcon',
  quote: 'QuoteDownIcon',
  repost: 'RepeatIcon',
  clap: 'Clapping02Icon',
  follow: 'UserAdd01Icon',
};

function Row({ item }: { item: Notification }) {
  const open = () =>
    item.post
      ? router.push({ pathname: '/post/[id]', params: { id: item.post.id } })
      : router.push({ pathname: '/member/[handle]', params: { handle: item.actor.handle } });
  return (
    <Pressable onPress={open} style={({ pressed }) => [styles.row, !item.read && styles.unread, pressed && { backgroundColor: '#F4F3EF' }]}>
      <View style={styles.kind}>
        <Icon name={icons[item.kind]} size={20} color={colors.primaryText} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Pressable onPress={() => router.push({ pathname: '/member/[handle]', params: { handle: item.actor.handle } })} hitSlop={4} style={{ alignSelf: 'flex-start' }}>
          <Avatar name={item.actor.name} seed={item.actor.handle} size={32} />
        </Pressable>
        <Text style={styles.text}>
          <Text style={{ fontFamily: font.bold }}>{item.actor.name}</Text> {t.notifications.kinds[item.kind]}
          <Text style={styles.time}> · {timeAgo(item.createdAt)}</Text>
        </Text>
        {!!item.post?.body && (
          <Text style={styles.body} numberOfLines={3}>
            {item.post.body}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/** Bildirimler: açılınca hepsi okundu sayılır; okunmamışlar açık sarı zeminle bir süre ayırt edilir. */
export default function Notifications() {
  const insets = useSafeAreaInsets();
  const { user, setUser } = useSession();
  const list = useNotifications(!!user);
  const markRead = useMarkRead();
  const qc = useQueryClient();
  const items = flatten(list.data);
  const hasUnread = (user?.unread ?? 0) > 0;

  useEffect(() => {
    if (!user || !hasUnread) return;
    markRead.mutate(undefined, { onSuccess: () => setUser({ ...user, unread: 0 }) });
    // Yalnız ekran açılışında bir kez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      data={items}
      keyExtractor={(n) => n.id}
      renderItem={({ item }) => <Row item={item} />}
      ListEmptyComponent={
        list.isPending ? (
          <Loading />
        ) : list.isError ? (
          <View style={{ padding: 16 }}>
            <ErrorNote text={errorText(list.error)} retryLabel={t.common.retry} onRetry={() => list.refetch()} />
          </View>
        ) : (
          <Empty icon="Notification03Icon" text={t.notifications.empty} />
        )
      }
      ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator style={{ padding: 20 }} color={colors.primaryText} /> : undefined}
      onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
      onEndReachedThreshold={0.6}
      refreshControl={
        <RefreshControl
          refreshing={list.isRefetching && !list.isFetchingNextPage}
          onRefresh={() => {
            list.refetch();
            qc.invalidateQueries({ queryKey: ['notifications'] });
          }}
        />
      }
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: insets.bottom + 40, maxWidth: 720, width: '100%', alignSelf: 'center' }}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D9D7E0',
  },
  unread: { backgroundColor: '#FFF8DC' },
  kind: { width: 42, alignItems: 'flex-end', paddingTop: 4 },
  text: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.fg },
  time: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.muted },
  body: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 20, color: colors.muted },
});
