import type { Project } from '@koina/shared/api';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { t } from '@/lib/i18n';
import { colors, font, radius, swatchFor } from '@/lib/theme';
import { Card } from './card';
import { Icon } from './icon';
import { Text } from './text';

const open = (slug: string) => router.push({ pathname: '/project/[slug]', params: { slug } });

export function StatusPill({ status }: { status: Project['status'] }) {
  const bg = status === 'shipped' ? colors.squiggle : status === 'building' ? colors.primary : colors.tint;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={styles.pillText}>{t.status[status]}</Text>
    </View>
  );
}

export function ProjectBadge({ project, size = 44 }: { project: Pick<Project, 'slug' | 'name'>; size?: number }) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: swatchFor(project.slug) }]}>
      <Text style={{ fontFamily: font.bold, fontSize: size * 0.42, lineHeight: size * 0.52, color: colors.fg }}>
        {project.name.charAt(0).toLocaleUpperCase('tr')}
      </Text>
    </View>
  );
}

/** "Usta arıyor" gibi çağrılar: projenin kapısı kime açık, ilk bakışta görünsün. */
export function Seeking({ project }: { project: Project }) {
  if (project.lookingFor.length === 0) return null;
  return (
    <View style={styles.seeking}>
      {project.lookingFor.map((r) => (
        <View key={r} style={styles.seek}>
          <Icon name="UserAdd01Icon" size={14} color={colors.primaryText} />
          <Text style={styles.seekText}>{t.projects.seeking[r]}</Text>
        </View>
      ))}
    </View>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Card style={{ gap: 12 }} onPress={() => open(project.slug)}>
      <View style={styles.head}>
        <ProjectBadge project={project} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="heading" style={{ fontSize: 17, lineHeight: 22 }}>{project.name}</Text>
          <Text variant="small" numberOfLines={1} style={{ fontSize: 13, lineHeight: 18 }}>{project.owner.name}</Text>
        </View>
        <StatusPill status={project.status} />
      </View>
      <Text style={{ fontSize: 15, lineHeight: 22 }}>{project.summary}</Text>
      <Seeking project={project} />
      <View style={styles.foot}>
        <View style={styles.stat}>
          <Icon name="UserGroupIcon" size={16} color={colors.muted} />
          <Text variant="small" style={{ fontSize: 13 }}>{t.projects.members(project.members)}</Text>
        </View>
        <View style={styles.stat}>
          <Icon name="BubbleChatIcon" size={16} color={colors.muted} />
          <Text variant="small" style={{ fontSize: 13 }}>{t.projects.posts(project.posts)}</Text>
        </View>
        {project.repoUrl && (
          <View style={styles.stat}>
            <Icon name="GithubIcon" size={16} color={colors.muted} />
          </View>
        )}
        {project.me && (
          <View style={[styles.stat, { marginLeft: 'auto' }]}>
            <Icon name="CheckmarkCircle02Icon" size={16} color={colors.primaryText} />
          </View>
        )}
      </View>
    </Card>
  );
}

/** Ana ekrandaki yatay şerit için dar karo. */
export function ProjectTile({ project }: { project: Project }) {
  return (
    <Pressable onPress={() => open(project.slug)} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}>
      <View style={styles.head}>
        <ProjectBadge project={project} size={36} />
        <StatusPill status={project.status} />
      </View>
      <Text style={styles.tileTitle} numberOfLines={1}>{project.name}</Text>
      <Text variant="small" numberOfLines={3} style={{ fontSize: 13, lineHeight: 18 }}>{project.summary}</Text>
      <View style={{ flex: 1 }} />
      {project.lookingFor[0] && <Text style={styles.seekText}>{t.projects.seeking[project.lookingFor[0]]}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  badge: { alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 10, height: 24, justifyContent: 'center', borderRadius: radius.pill },
  pillText: { fontFamily: font.semibold, fontSize: 12, lineHeight: 15, color: colors.fg },
  seeking: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  seek: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#C9CEF5',
  },
  seekText: { fontFamily: font.medium, fontSize: 13, lineHeight: 17, color: colors.primaryText },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tile: {
    width: 220,
    minHeight: 170,
    gap: 8,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tileTitle: { fontFamily: font.bold, fontSize: 16, lineHeight: 21, color: colors.fg },
});
