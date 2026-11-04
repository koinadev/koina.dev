import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, ErrorNote, Loading } from '@/components/misc';
import { PostItem } from '@/components/post-item';
import { Text } from '@/components/text';
import { errorText, formatEventDate, t } from '@/lib/i18n';
import { useThread } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { colors, font } from '@/lib/theme';

/**
 * Gönderi sayfası: üstte konunun zinciri (kökten bu gönderiye, avatarlar çizgiyle bağlı), ortada gönderi büyük, altında
 * doğrudan yanıtlar (eskiden yeniye), en altta yanıt çubuğu. Zincir varsa sayfa gönderinin hizasından açılır.
 */
export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const thread = useThread(id);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [focusY, setFocusY] = useState<number | null>(null);
  const hasAncestors = (thread.data?.ancestors.length ?? 0) > 0;

  useEffect(() => {
    if (focusY !== null && hasAncestors) scroll.current?.scrollTo({ y: focusY, animated: false });
  }, [focusY, hasAncestors]);

  if (thread.isPending) return <Loading />;
  if (thread.isError)
    return (
      <View style={{ padding: 16 }}>
        <ErrorNote text={errorText(thread.error)} retryLabel={t.common.retry} onRetry={() => thread.refetch()} />
      </View>
    );
  const { ancestors, post, replies } = thread.data;
  const reply = () => router.push(user ? { pathname: '/compose', params: { parent: post.id } } : '/login');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: t.feed.thread }} />
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90, maxWidth: 720, width: '100%', alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={thread.isRefetching} onRefresh={() => void thread.refetch()} />}>
        {ancestors.map((a, i) => (
          <PostItem key={a.id} post={a} above={i > 0} below />
        ))}
        <View onLayout={(e) => focusY === null && setFocusY(e.nativeEvent.layout.y)}>
          <PostItem post={post} focus last above={hasAncestors} />
        </View>
        <Text style={styles.date}>{formatEventDate(post.createdAt)}</Text>
        <Text style={styles.count}>{t.feed.repliesTitle(replies.length)}</Text>
        {replies.map((r, i) => (
          <PostItem key={r.id} post={r} last={i === replies.length - 1} />
        ))}
      </ScrollView>
      <Pressable onPress={reply} style={[styles.bar, { paddingBottom: insets.bottom + 10 }]} accessibilityRole="button">
        {user && <Avatar name={user.name} seed={user.handle} size={32} />}
        <View style={styles.input}>
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 20 }}>{t.feed.replyPlaceholder}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  date: { paddingHorizontal: 16, marginTop: -2, paddingBottom: 12, fontFamily: font.regular, fontSize: 14, lineHeight: 19, color: colors.muted },
  count: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: font.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.fg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D7E0',
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D9D7E0',
  },
  input: { flex: 1, height: 40, borderRadius: 20, backgroundColor: colors.tint, justifyContent: 'center', paddingHorizontal: 16 },
});
