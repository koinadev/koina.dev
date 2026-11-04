import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BlogCard } from '@/components/blog-card';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { LiveCard } from '@/components/live-card';
import { Avatar } from '@/components/misc';
import { PostItem } from '@/components/post-item';
import { ProjectTile } from '@/components/project-card';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Wordmark } from '@/components/wordmark';
import { content } from '@/lib/content';
import { t } from '@/lib/i18n';
import { openTarget } from '@/lib/open';
import { useBlog, useFeed, useProjects, useTrending } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { colors, font, radius } from '@/lib/theme';

function SectionHead({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionHead}>
      <Text variant="heading" style={{ fontSize: 21, lineHeight: 26 }}>{title}</Text>
      {action && (
        <Pressable onPress={onPress} hitSlop={8} accessibilityRole="link" style={styles.sectionLink}>
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.primaryText }}>{action}</Text>
          <Icon name="ArrowRight01Icon" size={16} color={colors.primaryText} />
        </Pressable>
      )}
    </View>
  );
}

/** Gündemdeki etiketler: son 7 günde en çok kişinin kullandığı etiketler; dokununca etiket sayfası açılır. */
function Trending() {
  const trending = useTrending();
  const items = trending.data?.items.slice(0, 10) ?? [];
  if (items.length === 0) return null;
  return (
    <View style={{ gap: 12 }}>
      <SectionHead title={t.home.trending} />
      <View style={styles.tags}>
        {items.map((tr) => (
          <Pressable
            key={tr.tag}
            onPress={() => router.push({ pathname: '/tag/[tag]', params: { tag: tr.tag } })}
            style={({ pressed }) => [styles.tag, pressed && { opacity: 0.7 }]}
            accessibilityRole="link">
            <Text style={styles.tagText}>#{tr.tag}</Text>
            <Text style={styles.tagCount}>{t.feed.tagPosts(tr.posts)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Bildirim zili: okunmamış sayısı rozetle. */
function Bell({ unread }: { unread: number }) {
  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `${t.home.notifications} (${unread})` : t.home.notifications}
      hitSlop={6}
      style={styles.bell}>
      <Icon name="Notification03Icon" size={22} />
      {unread > 0 && (
        <View style={styles.dot}>
          <Text style={styles.dotText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function Home() {
  const { user, refresh } = useSession();
  const { home } = content;
  const feed = useFeed({ tab: 'top' });
  const trending = useTrending();
  // Ana sayfaya her dönüşte okunmamış bildirim sayısı tazelenir.
  const signedIn = !!user;
  useFocusEffect(
    useCallback(() => {
      if (signedIn) refresh();
    }, [signedIn, refresh]),
  );
  const projects = useProjects();
  const blog = useBlog();
  const posts = feed.data?.pages[0]?.items.slice(0, 3) ?? [];
  // Önce ekip arayanlar: ana ekranın işi, birinin katılabileceği bir kapı göstermek.
  const open = (projects.data?.pages[0]?.items ?? [])
    .slice()
    .sort((a, b) => Number(b.lookingFor.length > 0) - Number(a.lookingFor.length > 0))
    .slice(0, 6);
  const latest = blog.data?.posts.slice(0, 2) ?? [];

  return (
    <Screen refreshing={feed.isRefetching} onRefresh={() => { feed.refetch(); projects.refetch(); blog.refetch(); trending.refetch(); if (user) refresh(); }}>
      <View style={styles.brand}>
        <Wordmark />
        <View style={styles.headActions}>
        {user && <Bell unread={user.unread} />}
        <Pressable
          onPress={() => router.push(user ? '/me' : '/login')}
          accessibilityRole="button"
          accessibilityLabel={user ? t.tabs.me : t.home.join}
          hitSlop={6}>
          {user ? (
            <Avatar name={user.name} seed={user.handle} size={36} />
          ) : (
            <View style={styles.signIn}>
              <Text style={{ fontFamily: font.semibold, fontSize: 14 }}>{t.common.signInToAct}</Text>
            </View>
          )}
        </Pressable>
        </View>
      </View>

      {user ? (
        <Text variant="hand" style={{ fontSize: 30, lineHeight: 34, color: colors.primaryText }}>{t.home.hello(user.name.split(' ')[0])}</Text>
      ) : (
        <>
          <View style={styles.badges}>
            {home.badges.map((b) => (
              <View key={b.label} style={styles.badge}>
                <Icon name={b.icon} size={16} color={colors.primaryText} />
                <Text style={{ fontFamily: font.medium, fontSize: 13 }}>{b.label}</Text>
              </View>
            ))}
          </View>
          <Text variant="display">{t.home.title}</Text>
          <Text variant="small" style={{ fontSize: 16, lineHeight: 24 }}>{t.home.lead}</Text>
          <View style={styles.ctas}>
            <Button label={t.home.join} icon="UserAdd01Icon" onPress={() => router.push('/login')} />
            <Button variant="outline" label={t.home.explore} icon="Compass01Icon" onPress={() => router.push('/explore')} />
          </View>
        </>
      )}

      <LiveCard />

      {open.length > 0 && (
        <View style={{ gap: 12 }}>
          <SectionHead title={t.home.projects} action={t.home.seeProjects} onPress={() => router.push('/explore')} />
          {/* Ekran kenarına kadar kayan şerit: Screen'in yatay payı burada geri alınıyor. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
            {open.map((p) => (
              <ProjectTile key={p.id} project={p} />
            ))}
          </ScrollView>
        </View>
      )}

      {posts.length > 0 && (
        <View style={{ gap: 12 }}>
          <SectionHead title={t.home.fromFeed} action={t.home.seeFeed} onPress={() => router.push('/feed')} />
          <View style={styles.feed}>
            {posts.map((post, i) => (
              <PostItem key={post.id} post={post} last={i === posts.length - 1} />
            ))}
          </View>
        </View>
      )}

      <Trending />

      <View style={{ gap: 6, marginTop: 8 }}>
        <Text variant="hand" style={{ color: colors.primaryText }}>{home.pillars.note}</Text>
        <Text variant="heading" style={{ fontSize: 24, lineHeight: 29 }}>{home.pillars.title}</Text>
        <Text variant="small" style={{ fontSize: 15, lineHeight: 22 }}>{home.pillars.description}</Text>
      </View>
      <View style={styles.grid}>
        {home.pillars.items.map((p) => (
          <Card key={p.title} style={styles.pillar}>
            <Icon name={p.icon} color={colors.primaryText} />
            <Text style={{ fontFamily: font.semibold, fontSize: 15 }}>{p.title}</Text>
            <Text variant="small" style={{ fontSize: 13, lineHeight: 18 }}>{p.text}</Text>
          </Card>
        ))}
      </View>

      {latest.length > 0 && (
        <View style={{ gap: 12, marginTop: 8 }}>
          <SectionHead title={t.home.blog} action={t.home.seeBlog} onPress={() => router.push('/blog')} />
          {latest.map((post, i) => (
            <BlogCard key={post.slug} post={post} large={i === 0} />
          ))}
        </View>
      )}

      <Card style={styles.imece} onPress={() => openTarget(home.imece.link)}>
        <Text variant="heading" style={{ color: colors.bg, fontSize: 21, lineHeight: 26 }}>{home.imece.title}</Text>
        <Text style={{ color: colors.primary, fontFamily: font.semibold }}>{home.imece.link.label}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  signIn: { paddingHorizontal: 14, height: 34, borderRadius: radius.pill, backgroundColor: colors.primary, justifyContent: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ctas: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  sectionLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bell: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 0,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.live,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  dotText: { fontFamily: font.bold, fontSize: 10, lineHeight: 12, color: '#fff' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  tagText: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, color: colors.primaryText },
  tagCount: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: colors.muted },
  feed: { marginHorizontal: -16, backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pillar: { width: '48.5%', flexGrow: 1, gap: 6, padding: 14 },
  imece: { backgroundColor: colors.fg, borderColor: colors.fg, gap: 10, marginTop: 12 },
});
