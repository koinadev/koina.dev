import type { Link } from '@koina/shared/api';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { errorText, t, timeAgo } from '@/lib/i18n';
import { useVoteLink } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { colors, font, radius } from '@/lib/theme';
import { Icon } from './icon';
import { Text } from './text';

/** "İşe yarar" düğmesi: oy sayısıyla birlikte; oy verilmişse sarı. */
export function VoteButton({ link, large }: { link: Link; large?: boolean }) {
  const { user } = useSession();
  const vote = useVoteLink();
  const onPress = () => {
    if (!user) return router.push('/login');
    Haptics.selectionAsync().catch(() => undefined);
    vote.mutate({ id: link.id, on: !link.voted }, { onError: (err) => Alert.alert(errorText(err)) });
  };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t.links.useful}
      accessibilityState={{ selected: !!link.voted }}
      hitSlop={6}
      style={({ pressed }) => [styles.vote, large && styles.voteLarge, link.voted && styles.voted, pressed && { opacity: 0.7 }]}>
      <Icon name="ThumbsUpIcon" size={large ? 20 : 16} color={colors.fg} strokeWidth={link.voted ? 2 : 1.6} />
      <Text style={[styles.voteText, large && { fontSize: 15, lineHeight: 20 }]}>{t.links.votes(link.votes)}</Text>
    </Pressable>
  );
}

/** Bağlantı satırı: kaynak alan adı, başlık, açıklama, kategori ve etiketler; sağda küçük görsel. */
export function LinkItem({ link }: { link: Link }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/link/[id]', params: { id: link.id } })}
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}>
      <View style={styles.top}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.host} numberOfLines={1}>
            {link.host} · {t.links.categories[link.category]}
          </Text>
          <Text style={styles.title} numberOfLines={2}>{link.title}</Text>
          {!!link.description && <Text style={styles.text} numberOfLines={2}>{link.description}</Text>}
        </View>
        {link.image && <Image source={{ uri: link.image }} style={styles.image} contentFit="cover" transition={150} />}
      </View>
      <View style={styles.bottom}>
        <VoteButton link={link} />
        <Text style={styles.meta} numberOfLines={1}>
          {link.tags.map((tag) => `#${tag}`).join(' ')}
          {link.tags.length > 0 ? ' · ' : ''}
          {timeAgo(link.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { gap: 12, padding: 16, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  top: { flexDirection: 'row', gap: 12 },
  host: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 16, color: colors.muted },
  title: { fontFamily: font.semibold, fontSize: 16, lineHeight: 21, color: colors.fg },
  text: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  image: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.tint },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meta: { flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: colors.muted },
  vote: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.tint },
  voteLarge: { height: 44, paddingHorizontal: 18 },
  voted: { backgroundColor: colors.primary },
  voteText: { fontFamily: font.semibold, fontSize: 13, lineHeight: 17, color: colors.fg },
});
