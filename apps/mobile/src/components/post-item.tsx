import type { LinkPreview, Post, QuotedPost } from '@koina/shared/api';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { APP_URL } from '@/lib/config';
import { errorText, t, timeAgo } from '@/lib/i18n';
import { openUrl } from '@/lib/open';
import { useDeletePost, useReact, useReport, type Reaction } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { pickReportReason, showSheet } from '@/lib/sheet';
import { colors, font, radius } from '@/lib/theme';
import { Icon, type IconName } from './icon';
import { MediaGrid } from './media-grid';
import { Avatar } from './misc';
import { RichText } from './rich-text';
import { Text } from './text';

const LINE = '#D9D7E0';
const toMember = (handle: string) => router.push({ pathname: '/member/[handle]', params: { handle } });
const toPost = (id: string) => router.push({ pathname: '/post/[id]', params: { id } });

/** Rol rozeti: adın yanında küçük bir hap; usta sarı, fikir sahibi pembe, katılımcı mavi. */
export function RoleBadge({ role }: { role: Post['author']['roles'][number] }) {
  const bg = role === 'mentor' ? colors.primary : role === 'founder' ? '#FFE0EA' : colors.tint;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.badgeText}>{t.roles[role]}</Text>
    </View>
  );
}

function Action({ icon, count, active, onPress, a11y }: {
  icon: IconName;
  count?: string;
  active?: boolean;
  onPress: () => void;
  a11y: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ selected: !!active }}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.action, active && styles.actionActive, pressed && { opacity: 0.6 }]}>
      <Icon name={icon} size={18} color={active ? colors.fg : colors.muted} strokeWidth={active ? 2 : 1.6} />
      {!!count && <Text style={[styles.count, active && { color: colors.fg }]}>{count}</Text>}
    </Pressable>
  );
}

/** Bağlantı kartı: gönderideki ilk adresin önbilgisi; dokununca uygulama içi tarayıcıda açılır. */
export function LinkCard({ preview }: { preview: LinkPreview }) {
  const host = preview.siteName || preview.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  return (
    <Pressable onPress={() => openUrl(preview.url)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]} accessibilityRole="link">
      {preview.image && <Image source={{ uri: preview.image }} style={styles.cardImage} contentFit="cover" transition={150} />}
      <View style={styles.cardBody}>
        <Text style={styles.cardHost} numberOfLines={1}>{host}</Text>
        {!!preview.title && <Text style={styles.cardTitle} numberOfLines={2}>{preview.title}</Text>}
        {!!preview.description && <Text style={styles.cardText} numberOfLines={2}>{preview.description}</Text>}
      </View>
    </Pressable>
  );
}

/** Alıntılanan gönderi: çerçeveli küçük kopya. Gizlenmiş ya da silinmişse yalnız "kullanılamıyor" yazar. */
export function QuoteEmbed({ quote, disabled }: { quote: QuotedPost; disabled?: boolean }) {
  if (quote.unavailable)
    return (
      <View style={[styles.quote, styles.quoteGone]}>
        <Text variant="small">{t.feed.unavailable}</Text>
      </View>
    );
  return (
    <Pressable disabled={disabled} onPress={() => toPost(quote.id)} style={({ pressed }) => [styles.quote, pressed && { backgroundColor: '#F4F3EF' }]}>
      <View style={styles.quoteHead}>
        <Avatar name={quote.author.name} seed={quote.author.handle} size={20} />
        <Text numberOfLines={1} style={[styles.name, { fontSize: 14 }]}>{quote.author.name}</Text>
        <Text numberOfLines={1} style={[styles.meta, { fontSize: 13 }]}>@{quote.author.handle} · {timeAgo(quote.createdAt)}</Text>
      </View>
      {!!quote.body && <Text style={styles.quoteBody} numberOfLines={5}>{quote.body}</Text>}
      {quote.media.length > 0 && <MediaGrid media={quote.media} compact />}
    </Pressable>
  );
}

/**
 * Akış satırı, X'teki zaman akışı düzeninde: solda avatar sütunu, sağda ad · @kullanıcı · zaman, metin, görseller,
 * bağlantı kartı, alıntı ve eylem satırı. Kart yok; satırları ince çizgi ayırır. `focus`: gönderi sayfasının başındaki
 * büyük hâli. `above` / `below`: konu zincirinde avatarları birleştiren dikey çizgi.
 */
export function PostItem({ post, focus, last, above, below }: { post: Post; focus?: boolean; last?: boolean; above?: boolean; below?: boolean }) {
  const { user } = useSession();
  const react = useReact();
  const remove = useDeletePost();
  const report = useReport();
  const mine = user?.handle === post.author.handle;
  // Zincirde avatarlar aynı boyda kalır ki birleştiren çizgi düz insin.
  const size = focus && !above ? 48 : 42;
  const signedIn = (fn: () => void) => () => (user ? fn() : router.push('/login'));

  const toggle = (kind: Reaction, on: boolean) => {
    Haptics.selectionAsync().catch(() => undefined);
    react.mutate({ id: post.id, kind, on }, { onError: (err) => Alert.alert(errorText(err)) });
  };
  const onReply = signedIn(() => router.push({ pathname: '/compose', params: { parent: post.id } }));
  const onRepost = signedIn(() =>
    showSheet([
      { label: post.reposted ? t.feed.undoRepost : t.feed.repost, onPress: () => toggle('repost', !post.reposted) },
      { label: t.feed.quote, onPress: () => router.push({ pathname: '/compose', params: { quote: post.id } }) },
    ]),
  );
  const onShare = () => Share.share({ message: `${post.body}\n\n${APP_URL}/akis/${post.id}`.trim() }).catch(() => undefined);
  const onDelete = () =>
    Alert.alert(t.feed.deleteConfirm, undefined, [
      { text: t.feed.cancel, style: 'cancel' },
      {
        text: t.feed.delete,
        style: 'destructive',
        onPress: () =>
          remove.mutate(post.id, {
            onSuccess: () => focus && router.back(),
            onError: (err) => Alert.alert(errorText(err)),
          }),
      },
    ]);
  const onMore = () =>
    showSheet(
      mine
        ? [{ label: t.feed.delete, destructive: true, onPress: onDelete }]
        : [
            {
              label: t.report.action,
              destructive: true,
              onPress: signedIn(() => pickReportReason((reason) => report.mutateAsync({ target: 'post', id: post.id, reason }))),
            },
          ],
    );

  return (
    <Pressable
      disabled={focus}
      onPress={() => toPost(post.id)}
      onLongPress={onMore}
      style={({ pressed }) => [styles.row, !last && !below && styles.divider, pressed && { backgroundColor: '#F4F3EF' }]}>
      {post.repostedBy && (
        <View style={styles.repost}>
          <Icon name="RepeatIcon" size={14} color={colors.muted} strokeWidth={2} />
          <Text style={styles.repostText} numberOfLines={1} onPress={() => toMember(post.repostedBy!.handle)}>
            {post.repostedBy.handle === user?.handle ? t.feed.youReposted : t.feed.repostedBy(post.repostedBy.handle)}
          </Text>
        </View>
      )}
      <View style={styles.inner}>
        <View style={[styles.side, { width: size }]}>
          {above && <View style={[styles.thread, { top: -12, height: 12 }]} />}
          {below && <View style={[styles.thread, { top: size + 4, bottom: -8 }]} />}
          <Pressable onPress={() => toMember(post.author.handle)} accessibilityLabel={post.author.name} hitSlop={4}>
            <Avatar name={post.author.name} seed={post.author.handle} size={size} />
          </Pressable>
        </View>
        <View style={styles.main}>
          <View style={styles.head}>
            <Text numberOfLines={1} style={styles.name} onPress={() => toMember(post.author.handle)}>
              {post.author.name}
            </Text>
            {post.author.roles[0] && <RoleBadge role={post.author.roles[0]} />}
            <Text numberOfLines={1} style={styles.meta}>
              @{post.author.handle} · {timeAgo(post.createdAt)}
            </Text>
          </View>
          {post.replyTo && !above && (
            <Text style={styles.replyTo} numberOfLines={1}>
              {t.feed.replyingPrefix}
              <Text style={{ color: colors.primaryText }} onPress={() => toMember(post.replyTo!)}>@{post.replyTo}</Text>
            </Text>
          )}
          {post.hidden && (
            <View style={styles.hidden}>
              <Icon name="ViewOffIcon" size={15} color={colors.muted} />
              <Text style={styles.hiddenText}>{t.feed.hidden}</Text>
            </View>
          )}
          {!!post.body && <RichText body={post.body} style={focus ? styles.bodyFocus : styles.body} />}
          {post.media.length > 0 && <MediaGrid media={post.media} />}
          {post.preview && post.media.length === 0 && !post.quote && <LinkCard preview={post.preview} />}
          {post.quote && <QuoteEmbed quote={post.quote} />}
          {post.project && !post.parentId && (
            <Pressable
              style={styles.project}
              onPress={() => router.push({ pathname: '/project/[slug]', params: { slug: post.project!.slug } })}>
              <Icon name="SourceCodeIcon" size={15} color={colors.primaryText} />
              <Text style={styles.projectText}>{post.project.name}</Text>
            </Pressable>
          )}
          <View style={styles.actions}>
            <Action icon="Comment01Icon" count={t.feed.count(post.replies)} onPress={onReply} a11y={t.feed.reply} />
            <Action icon="RepeatIcon" count={t.feed.count(post.reposts + post.quotes)} active={post.reposted} onPress={onRepost} a11y={t.feed.repost} />
            <Action
              icon="Clapping02Icon"
              count={t.feed.count(post.claps)}
              active={post.clapped}
              onPress={signedIn(() => toggle('clap', !post.clapped))}
              a11y={t.feed.clap}
            />
            <Action
              icon="Bookmark02Icon"
              active={post.bookmarked}
              onPress={signedIn(() => toggle('bookmark', !post.bookmarked))}
              a11y={post.bookmarked ? t.feed.unbookmark : t.feed.bookmark}
            />
            <Action icon="Share08Icon" onPress={onShare} a11y={t.feed.share} />
            <Action icon="MoreHorizontalIcon" onPress={onMore} a11y={t.feed.more} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingTop: 12, paddingBottom: 8, paddingHorizontal: 16, gap: 4 },
  inner: { flexDirection: 'row', gap: 12 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE },
  side: { alignItems: 'center' },
  thread: { position: 'absolute', width: 2, backgroundColor: LINE, borderRadius: 1 },
  repost: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 26 },
  repostText: { fontFamily: font.semibold, fontSize: 13, lineHeight: 17, color: colors.muted },
  main: { flex: 1, gap: 6, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'nowrap' },
  name: { fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: colors.fg, flexShrink: 0, maxWidth: '62%' },
  meta: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.muted, flexShrink: 1 },
  replyTo: { fontFamily: font.regular, fontSize: 14, lineHeight: 19, color: colors.muted, marginTop: -4 },
  body: { fontFamily: font.regular, fontSize: 15.5, lineHeight: 22, color: colors.fg },
  bodyFocus: { fontFamily: font.regular, fontSize: 19, lineHeight: 27, color: colors.fg },
  hidden: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: radius.sm, backgroundColor: colors.tint },
  hiddenText: { fontFamily: font.medium, fontSize: 13, lineHeight: 17, color: colors.muted, flexShrink: 1 },
  badge: { paddingHorizontal: 7, height: 20, borderRadius: radius.pill, justifyContent: 'center' },
  badgeText: { fontFamily: font.semibold, fontSize: 11, lineHeight: 14, color: colors.fg },
  card: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: LINE, overflow: 'hidden', backgroundColor: colors.surface },
  cardImage: { width: '100%', aspectRatio: 1.91, backgroundColor: colors.tint },
  cardBody: { padding: 12, gap: 2 },
  cardHost: { fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: colors.muted },
  cardTitle: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, color: colors.fg },
  cardText: { fontFamily: font.regular, fontSize: 14, lineHeight: 19, color: colors.muted },
  quote: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: LINE, padding: 12, gap: 6 },
  quoteGone: { backgroundColor: colors.tint, borderWidth: 0 },
  quoteHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quoteBody: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 20, color: colors.fg },
  project: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.tint,
  },
  projectText: { fontFamily: font.medium, fontSize: 13, lineHeight: 17, color: colors.primaryText },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2, marginLeft: -6 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, minWidth: 32, paddingHorizontal: 6, borderRadius: radius.pill },
  actionActive: { backgroundColor: colors.primary },
  count: { fontFamily: font.medium, fontSize: 13, lineHeight: 17, color: colors.muted },
});
