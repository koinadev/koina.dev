import type { FeedTab } from '@koina/shared/api';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icon';
import { Avatar } from '@/components/misc';
import { PostList } from '@/components/post-list';
import { Text } from '@/components/text';
import { UnderlineTabs } from '@/components/underline-tabs';
import { t } from '@/lib/i18n';
import { useFeed } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { colors, font, radius } from '@/lib/theme';

export default function Feed() {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const [picked, setPicked] = useState<FeedTab>('top');
  // Takip sekmesi yalnız girişliyken var; çıkış yapılınca öne çıkanlara dönülür.
  const tab: FeedTab = picked === 'following' && !user ? 'top' : picked;
  const feed = useFeed({ tab });
  const compose = () => router.push(user ? '/compose' : '/login');
  const tabs = (['top', ...(user ? (['following'] as const) : []), 'latest'] as FeedTab[]).map((value) => ({ value, label: t.feed.tabs[value] }));

  const header = (
    <View>
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <Text variant="title">{t.feed.title}</Text>
      </View>
      <UnderlineTabs value={tab} options={tabs} onChange={setPicked} />
      <Pressable onPress={compose} style={styles.composer} accessibilityRole="button" accessibilityLabel={t.feed.compose}>
        {user ? (
          <Avatar name={user.name} seed={user.handle} size={40} />
        ) : (
          <View style={styles.ghostAvatar}>
            <Icon name="UserIcon" size={20} color={colors.muted} />
          </View>
        )}
        <Text style={styles.composerText}>{t.feed.whatsUp}</Text>
        <View style={styles.composerButton}>
          <Text style={{ fontFamily: font.semibold, fontSize: 14, lineHeight: 18 }}>{t.feed.compose}</Text>
        </View>
      </Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PostList query={feed} header={header} empty={tab === 'following' ? t.feed.emptyFollowing : t.feed.empty} bottomPad={140} />
      {/* Yazma düğmesi her zaman başparmak hizasında; sekme çubuğunun hemen üstünde. */}
      <Pressable
        onPress={compose}
        accessibilityRole="button"
        accessibilityLabel={t.feed.compose}
        style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 66 }, pressed && { transform: [{ scale: 0.95 }] }]}>
        <Icon name="QuillWrite02Icon" size={26} color={colors.fg} strokeWidth={1.8} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 16, paddingBottom: 8 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D9D7E0',
  },
  ghostAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  composerText: { flex: 1, fontFamily: font.regular, fontSize: 16, lineHeight: 22, color: colors.muted },
  composerButton: { paddingHorizontal: 16, height: 34, borderRadius: radius.pill, backgroundColor: colors.primary, justifyContent: 'center' },
  fab: {
    position: 'absolute',
    right: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.fg,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
