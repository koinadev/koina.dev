import type { Member, MemberProfile } from '@koina/shared/api';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_URL } from '@/lib/config';
import { formatDay, t } from '@/lib/i18n';
import { openUrl } from '@/lib/open';
import { useFeed, useFollow, useMember, useReport } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { pickReportReason, showSheet } from '@/lib/sheet';
import { colors, font, radius, swatchFor } from '@/lib/theme';
import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Avatar, Chip, Empty, Loading } from './misc';
import { PostItem, RoleBadge } from './post-item';
import { ProjectCard } from './project-card';
import { Text } from './text';

type Tab = 'posts' | 'projects';

function Meta({ icon, label, onPress }: { icon: IconName; label: string; onPress?: () => void }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.meta} accessibilityRole={onPress ? 'link' : 'text'}>
      <Icon name={icon} size={16} color={colors.muted} />
      <Text style={[styles.metaText, onPress && { color: colors.primaryText }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/**
 * Profil: renkli kapak şeridi, büyük avatar, künye, sayılar ve iki sekme (paylaşımlar, projeler).
 * Kendi profilinde `member` oturumdan gelir, istatistikler ve projeler profil ucundan dolar;
 * `extra` sekmelerin üstünde (yaklaşan etkinlikler), `footer` en altta (hesap ayarları) durur.
 */
export function ProfileView({ member, mine, extra, footer, top }: {
  member: Member;
  mine?: boolean;
  extra?: ReactNode;
  footer?: ReactNode;
  top?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('posts');
  const profile = useMember(member.handle);
  const feed = useFeed({ author: member.handle });
  const p: Member & Partial<MemberProfile> = { ...member, ...profile.data };
  const posts = feed.data?.pages.flatMap((pg) => pg.items) ?? [];
  const site = p.website?.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const { user } = useSession();
  const follow = useFollow(member.handle);
  const report = useReport();
  const onFollow = () => (user ? follow.mutate(!p.followed) : router.push('/login'));
  const onMore = () =>
    showSheet([
      { label: t.me.share, onPress: share },
      {
        label: t.report.action,
        destructive: true,
        onPress: () =>
          user ? pickReportReason((reason) => report.mutateAsync({ target: 'member', id: member.handle, reason })) : router.push('/login'),
      },
    ]);
  const share = () => Share.share({ message: `${p.name} (@${p.handle}) · koina.dev\n${APP_URL}/u/${p.handle}` }).catch(() => undefined);

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingBottom: insets.bottom + 110, maxWidth: 720, width: '100%', alignSelf: 'center' }}
      refreshControl={
        <RefreshControl refreshing={profile.isRefetching || feed.isRefetching} onRefresh={() => { profile.refetch(); feed.refetch(); }} />
      }>
      <View style={[styles.cover, { backgroundColor: swatchFor(p.handle, 1), height: (top ? insets.top : 0) + 96 }]}>
        <View style={[styles.coverDot, { backgroundColor: colors.surface, opacity: 0.35 }]} />
      </View>
      <View style={styles.body}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarRing}>
            <Avatar name={p.name} seed={p.handle} size={84} />
          </View>
          <View style={styles.actions}>
            {mine ? (
              <>
                <Pressable onPress={share} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={t.me.share}>
                  <Icon name="Share08Icon" size={20} />
                </Pressable>
                <Button small variant="outline" label={t.me.edit} onPress={() => router.push('/edit-profile')} />
              </>
            ) : (
              <>
                <Pressable onPress={onMore} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={t.me.more}>
                  <Icon name="MoreHorizontalIcon" size={20} />
                </Pressable>
                {profile.data && (
                  <Button
                    small
                    variant={p.followed ? 'outline' : 'primary'}
                    icon={p.followed ? 'UserCheck01Icon' : 'UserAdd01Icon'}
                    label={p.followed ? t.me.unfollow : t.me.follow}
                    onPress={onFollow}
                  />
                )}
              </>
            )}
          </View>
        </View>

        <View style={{ gap: 2 }}>
          <Text variant="title" style={{ fontSize: 26, lineHeight: 31 }}>{p.name}</Text>
          <Text variant="small" style={{ fontSize: 15 }}>@{p.handle}</Text>
        </View>
        {p.roles.length > 0 && (
          <View style={styles.row}>
            {p.roles.map((r) => (
              <RoleBadge key={r} role={r} />
            ))}
          </View>
        )}
        <Text style={!p.bio ? { color: colors.muted } : undefined}>{p.bio || (mine ? t.me.bioEmpty : '')}</Text>
        <View style={styles.metaRow}>
          {p.location && <Meta icon="Location01Icon" label={p.location} />}
          {site && <Meta icon="Link04Icon" label={site} onPress={() => openUrl(p.website!)} />}
          {p.github && <Meta icon="GithubIcon" label={p.github} onPress={() => openUrl(`https://github.com/${p.github}`)} />}
          <Meta icon="Calendar03Icon" label={t.me.since(formatDay(p.createdAt))} />
        </View>
        {p.interests.length > 0 && (
          <View style={styles.row}>
            {p.interests.map((i) => (
              <Chip key={i} label={`#${i}`} />
            ))}
          </View>
        )}
        {p.stats && (
          <View style={styles.stats}>
            <Stat value={p.stats.posts} label={t.me.stats.posts} />
            <Stat value={p.stats.followers} label={t.me.stats.followers} />
            <Stat value={p.stats.following} label={t.me.stats.following} />
            <Stat value={p.stats.claps} label={t.me.stats.claps} />
          </View>
        )}
      </View>

      {extra}

      <View style={styles.tabs} accessibilityRole="tablist">
        {(['posts', 'projects'] as const).map((key) => (
          <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: tab === key }} onPress={() => setTab(key)} style={styles.tab}>
            <Text style={[styles.tabText, tab === key && { color: colors.fg, fontFamily: font.bold }]}>
              {key === 'posts' ? t.me.posts : t.me.projects}
            </Text>
            <View style={[styles.tabLine, tab === key && { backgroundColor: colors.primaryText }]} />
          </Pressable>
        ))}
      </View>

      {tab === 'posts' ? (
        feed.isPending ? (
          <Loading />
        ) : posts.length === 0 ? (
          <Empty icon="BubbleChatIcon" text={t.me.emptyPosts} />
        ) : (
          posts.map((post, i) => <PostItem key={post.id} post={post} last={i === posts.length - 1} />)
        )
      ) : profile.isPending ? (
        <Loading />
      ) : (p.projects ?? []).length === 0 ? (
        <Empty icon="SourceCodeIcon" text={t.me.emptyProjects} />
      ) : (
        <View style={{ padding: 16, gap: 12 }}>
          {p.projects!.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </View>
      )}
      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', overflow: 'hidden' },
  coverDot: { position: 'absolute', right: -40, top: -60, width: 200, height: 200, borderRadius: 100 },
  body: { paddingHorizontal: 16, gap: 10 },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -42 },
  avatarRing: { borderRadius: 999, borderWidth: 4, borderColor: colors.bg },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 4 },
  iconButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%' },
  metaText: { fontFamily: font.regular, fontSize: 14, lineHeight: 19, color: colors.muted, flexShrink: 1 },
  stats: {
    flexDirection: 'row',
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontFamily: font.bold, fontSize: 20, lineHeight: 24, color: colors.fg },
  statLabel: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 16, color: colors.muted },
  tabs: { flexDirection: 'row', marginTop: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D9D7E0' },
  tab: { flex: 1, alignItems: 'center', paddingTop: 10 },
  tabText: { fontFamily: font.medium, fontSize: 15, lineHeight: 20, color: colors.muted, paddingBottom: 10 },
  tabLine: { height: 3, width: 64, borderRadius: 2, backgroundColor: 'transparent' },
});
