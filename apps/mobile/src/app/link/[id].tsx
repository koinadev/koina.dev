import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { VoteButton } from '@/components/link-item';
import { Avatar, Chip, ErrorNote, Loading } from '@/components/misc';
import { Text } from '@/components/text';
import { errorText, formatDay, t } from '@/lib/i18n';
import { openUrl } from '@/lib/open';
import { useDeleteLink, useLink, useReport } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { pickReportReason, showSheet } from '@/lib/sheet';
import { colors, font, radius } from '@/lib/theme';

/** Bağlantı sayfası: görsel, başlık, açıklama, kim paylaştı, "işe yarar" oyu ve adresi açma düğmesi. */
export default function LinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const link = useLink(id);
  const remove = useDeleteLink();
  const report = useReport();

  if (link.isPending) return <Loading />;
  if (link.isError)
    return (
      <View style={{ padding: 16 }}>
        <ErrorNote text={errorText(link.error)} retryLabel={t.common.retry} onRetry={() => link.refetch()} />
      </View>
    );
  const l = link.data;
  const mine = user?.handle === l.author.handle;
  const onMore = () =>
    showSheet(
      mine
        ? [
            {
              label: t.links.delete,
              destructive: true,
              onPress: () =>
                Alert.alert(t.links.deleteConfirm, undefined, [
                  { text: t.feed.cancel, style: 'cancel' },
                  {
                    text: t.feed.delete,
                    style: 'destructive',
                    onPress: () => remove.mutate(l.id, { onSuccess: () => router.back(), onError: (err) => Alert.alert(errorText(err)) }),
                  },
                ]),
            },
          ]
        : [
            {
              label: t.report.action,
              destructive: true,
              onPress: () =>
                user ? pickReportReason((reason) => report.mutateAsync({ target: 'link', id: l.id, reason })) : router.push('/login'),
            },
          ],
    );

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 40, maxWidth: 720, width: '100%', alignSelf: 'center' }}
      refreshControl={<RefreshControl refreshing={link.isRefetching} onRefresh={() => void link.refetch()} />}>
      <Stack.Screen
        options={{
          title: t.links.detail,
          headerRight: () => (
            <Pressable onPress={onMore} hitSlop={10} accessibilityRole="button" accessibilityLabel={t.feed.more}>
              <Icon name="MoreHorizontalIcon" size={22} />
            </Pressable>
          ),
        }}
      />
      {l.image && <Image source={{ uri: l.image }} style={styles.image} contentFit="cover" transition={150} />}
      <Text style={styles.host}>{l.siteName || l.host}</Text>
      <Text variant="title" style={{ fontSize: 24, lineHeight: 29 }}>{l.title}</Text>
      {!!l.description && <Text style={{ fontSize: 16, lineHeight: 24 }}>{l.description}</Text>}
      <View style={styles.row}>
        <Chip label={t.links.categories[l.category]} />
        {l.tags.map((tag) => (
          <Chip key={tag} label={`#${tag}`} />
        ))}
      </View>
      <View style={styles.actions}>
        <Button icon="LinkSquare02Icon" label={t.links.open} onPress={() => openUrl(l.url)} />
        <VoteButton link={l} large />
      </View>
      <Pressable onPress={() => router.push({ pathname: '/member/[handle]', params: { handle: l.author.handle } })} style={styles.author}>
        <Avatar name={l.author.name} seed={l.author.handle} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.semibold, lineHeight: 20 }}>{t.links.sharedBy(l.author.name)}</Text>
          <Text variant="small" style={{ fontSize: 13, lineHeight: 18 }}>@{l.author.handle} · {formatDay(l.createdAt)}</Text>
        </View>
      </Pressable>
      <Text variant="small" selectable numberOfLines={2} style={{ fontSize: 13, lineHeight: 18 }}>{l.url}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', aspectRatio: 1.91, borderRadius: radius.md, backgroundColor: colors.tint },
  host: { fontFamily: font.medium, fontSize: 14, lineHeight: 18, color: colors.muted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginTop: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
