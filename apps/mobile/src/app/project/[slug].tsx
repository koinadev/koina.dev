import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { Avatar, Empty, ErrorNote, Loading } from '@/components/misc';
import { PostItem, RoleBadge } from '@/components/post-item';
import { ProjectBadge, Seeking, StatusPill } from '@/components/project-card';
import { Text } from '@/components/text';
import { errorText, t } from '@/lib/i18n';
import { openUrl } from '@/lib/open';
import { useFeed, useJoinProject, useProject } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { colors, font, radius } from '@/lib/theme';

export default function ProjectScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const project = useProject(slug);
  const feed = useFeed({ project: slug });
  const join = useJoinProject(slug);

  if (project.isPending) return <Loading />;
  if (project.isError)
    return (
      <View style={{ padding: 16 }}>
        <ErrorNote text={errorText(project.error)} onRetry={() => project.refetch()} retryLabel={t.common.retry} />
      </View>
    );
  const p = project.data;
  const isOwner = user?.handle === p.owner.handle;
  const posts = feed.data?.pages.flatMap((pg) => pg.items) ?? [];

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40, maxWidth: 720, width: '100%', alignSelf: 'center' }}
      refreshControl={<RefreshControl refreshing={project.isRefetching} onRefresh={() => { project.refetch(); feed.refetch(); }} />}>
      <Stack.Screen options={{ title: p.name }} />
      <View style={styles.body}>
        <View style={styles.head}>
          <ProjectBadge project={p} size={56} />
          <View style={{ flex: 1, gap: 6, alignItems: 'flex-start' }}>
            <Text variant="title" style={{ fontSize: 26, lineHeight: 31 }}>{p.name}</Text>
            <StatusPill status={p.status} />
          </View>
        </View>
        <Text style={{ fontSize: 17, lineHeight: 26 }}>{p.summary}</Text>
        <Seeking project={p} />
        <View style={styles.actions}>
          {!isOwner && (
            <Button
              icon={p.me ? 'CheckmarkCircle02Icon' : 'UserAdd01Icon'}
              variant={p.me ? 'ghost' : 'primary'}
              label={p.me ? t.projects.leave : t.projects.join}
              loading={join.isPending}
              onPress={() => (user ? join.mutate(!p.me) : router.push('/login'))}
            />
          )}
          {p.repoUrl && <Button variant="outline" icon="GithubIcon" label={t.projects.repo} onPress={() => openUrl(p.repoUrl!)} />}
        </View>

        <Text variant="heading" style={{ marginTop: 12 }}>{t.projects.team}</Text>
        <View style={styles.team}>
          {(p.team ?? []).map((m, i) => (
            <Pressable
              key={m.handle}
              onPress={() => router.push({ pathname: '/member/[handle]', params: { handle: m.handle } })}
              style={[styles.member, i > 0 && styles.memberLine]}>
              <Avatar name={m.name} seed={m.handle} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.semibold }}>{m.name}</Text>
                <Text variant="small" style={{ fontSize: 13 }}>
                  @{m.handle}
                  {m.handle === p.owner.handle ? ` · ${t.projects.owner}` : ''}
                </Text>
              </View>
              {m.roles[0] && <RoleBadge role={m.roles[0]} />}
            </Pressable>
          ))}
        </View>

        <View style={styles.feedHead}>
          <Text variant="heading">{t.projects.feed}</Text>
          {(p.me || isOwner) && (
            <Button small variant="ghost" icon="QuillWrite02Icon" label={t.projects.write} onPress={() => router.push({ pathname: '/compose', params: { project: slug } })} />
          )}
        </View>
      </View>
      <View style={styles.feed}>
        {feed.isPending ? (
          <Loading />
        ) : posts.length === 0 ? (
          <Empty icon="BubbleChatIcon" text={t.feed.empty} />
        ) : (
          posts.map((post, i) => <PostItem key={post.id} post={post} last={i === posts.length - 1} />)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  team: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  memberLine: { borderTopWidth: 1, borderTopColor: colors.line },
  feedHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  feed: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D9D7E0' },
});
