import { linkCategories, linkSorts, projectStatuses, type LinkCategory, type LinkSort, type ProjectStatus, type Role } from '@koina/shared/api';
import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon, type IconName } from '@/components/icon';
import { LinkItem } from '@/components/link-item';
import { Chip, Empty, ErrorNote, Loading, Segmented } from '@/components/misc';
import { ProjectCard } from '@/components/project-card';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { SITE_URL } from '@/lib/config';
import { content, type InfoPageKey } from '@/lib/content';
import { errorText, locale, t } from '@/lib/i18n';
import { openTarget, openUrl } from '@/lib/open';
import { flatten, useLinks, useProjects } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { colors, font, radius } from '@/lib/theme';

function Row({ icon, title, hint, onPress }: { icon: IconName; title: string; hint?: string; onPress: () => void }) {
  return (
    <Card style={styles.row} onPress={onPress}>
      <View style={styles.icon}>
        <Icon name={icon} size={20} color={colors.primaryText} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.semibold }}>{title}</Text>
        {hint && <Text variant="small" numberOfLines={2} style={{ fontSize: 13, lineHeight: 18 }}>{hint}</Text>}
      </View>
      <Icon name="ArrowRight01Icon" size={18} color={colors.muted} />
    </Card>
  );
}

/** Sayfa karosu: ikon, ad ve sayfanın kısa el yazısı notu. Uzun açıklama yok, hiçbir metin kesilmez. */
function Tile({ page: key }: { page: InfoPageKey }) {
  const page = content.pages[key];
  return (
    <Card fill style={styles.tile} onPress={() => router.push({ pathname: '/page/[key]', params: { key } })}>
      <View style={styles.tileIcon}>
        <Icon name={pageIcons[key]} size={20} color={colors.primaryText} />
      </View>
      <Text style={styles.tileTitle}>{page.meta.title}</Text>
      {page.hero.note && <Text variant="small" style={styles.tileNote}>{page.hero.note}</Text>}
    </Card>
  );
}

// Sayfalar okuyanın sorusuna göre gruplu: kimiz, bana ne var, nasıl işliyor, kurallar.
const groups: { title: keyof typeof t.explore.groups; pages: InfoPageKey[] }[] = [
  { title: 'know', pages: ['about', 'why', 'manifesto', 'imece'] },
  { title: 'forYou', pages: ['learners', 'mentors', 'founders', 'sponsor'] },
  { title: 'how', pages: ['howItWorks', 'projects', 'streams', 'faq'] },
  { title: 'more', pages: ['conduct', 'licensing'] },
];

const pairs = <T,>(list: T[]) => list.flatMap((item, i) => (i % 2 ? [] : [list.slice(i, i + 2)]));

const pageIcons: Record<InfoPageKey, IconName> = {
  about: 'UserGroupIcon',
  why: 'Plant02Icon',
  manifesto: 'Note01Icon',
  imece: 'HeartHandshakeIcon',
  howItWorks: 'WorkflowSquare03Icon',
  learners: 'Plant01Icon',
  mentors: 'MentoringIcon',
  founders: 'Idea01Icon',
  projects: 'SourceCodeIcon',
  streams: 'LiveStreaming01Icon',
  sponsor: 'GiftIcon',
  faq: 'HelpCircleIcon',
  conduct: 'Shield01Icon',
  licensing: 'LicenseIcon',
};

type View_ = 'projects' | 'links' | 'guide';

/** Proje keşfi: arama, durum ve "kimi arıyor" süzgeçleri; liste sayfa sayfa yüklenir. */
function Projects() {
  const { user } = useSession();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ProjectStatus | undefined>();
  const [role, setRole] = useState<Role | undefined>();
  // Her tuşta istek atılmasın: arama, yazma durulunca çalışır.
  const q = useDeferredValue(query.trim());
  const list = useProjects({ q: q.length >= 2 ? q : undefined, status, role });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <Search value={query} onChange={setQuery} placeholder={t.projects.search} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.chips}>
        <Chip label={t.projects.all} active={!status} onPress={() => setStatus(undefined)} />
        {projectStatuses.map((s) => (
          <Chip key={s} label={t.status[s]} active={status === s} onPress={() => setStatus(status === s ? undefined : s)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.chips}>
        {(['learner', 'mentor', 'founder'] as const).map((r) => (
          <Chip key={r} icon="UserAdd01Icon" label={t.projects.seeking[r]} active={role === r} onPress={() => setRole(role === r ? undefined : r)} />
        ))}
      </ScrollView>
      {list.isPending ? (
        <Loading />
      ) : list.isError ? (
        <ErrorNote text={errorText(list.error)} retryLabel={t.common.retry} onRetry={() => list.refetch()} />
      ) : items.length === 0 ? (
        <Empty icon="Idea01Icon" text={t.projects.empty} />
      ) : (
        items.map((p) => <ProjectCard key={p.id} project={p} />)
      )}
      {list.hasNextPage && (
        <Button variant="ghost" small label={t.common.more} loading={list.isFetchingNextPage} onPress={() => list.fetchNextPage()} />
      )}
      <Button icon="Rocket01Icon" variant="outline" label={t.projects.newProject} onPress={() => router.push(user ? '/new-project' : '/login')} />
    </>
  );
}

function Search({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <View style={styles.search}>
      <Icon name="Search01Icon" size={20} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        style={styles.searchInput}
      />
    </View>
  );
}

/** Faydalı bağlantılar: sıralama (öne çıkan / yeni), kategori ve arama; liste sayfa sayfa yüklenir. */
function Links() {
  const { user } = useSession();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<LinkSort>('top');
  const [category, setCategory] = useState<LinkCategory | undefined>();
  const q = useDeferredValue(query.trim());
  const list = useLinks({ sort, category, q: q.length >= 2 ? q : undefined });
  const items = flatten(list.data);

  return (
    <>
      <Search value={query} onChange={setQuery} placeholder={t.links.search} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.chips}>
        {linkSorts.map((s) => (
          <Chip key={s} icon={s === 'top' ? 'Fire03Icon' : 'Clock01Icon'} label={t.links.sort[s]} active={sort === s} onPress={() => setSort(s)} />
        ))}
        <View style={styles.sep} />
        <Chip label={t.links.all} active={!category} onPress={() => setCategory(undefined)} />
        {linkCategories.map((c) => (
          <Chip key={c} label={t.links.categories[c]} active={category === c} onPress={() => setCategory(category === c ? undefined : c)} />
        ))}
      </ScrollView>
      <Button icon="Link04Icon" variant="outline" label={t.links.add} onPress={() => router.push(user ? '/new-link' : '/login')} />
      {list.isPending ? (
        <Loading />
      ) : list.isError ? (
        <ErrorNote text={errorText(list.error)} retryLabel={t.common.retry} onRetry={() => list.refetch()} />
      ) : items.length === 0 ? (
        <Empty icon="Link04Icon" text={t.links.empty} />
      ) : (
        items.map((l) => <LinkItem key={l.id} link={l} />)
      )}
      {list.hasNextPage && (
        <Button variant="ghost" small label={t.common.more} loading={list.isFetchingNextPage} onPress={() => list.fetchNextPage()} />
      )}
    </>
  );
}

function Guide() {
  const { links } = content;
  return (
    <>
      <Row icon="News01Icon" title={t.blog.title} onPress={() => router.push('/blog')} />
      {groups.map((group) => (
        <View key={group.title} style={{ gap: 12 }}>
          <Text variant="heading" style={styles.section}>{t.explore.groups[group.title]}</Text>
          {pairs(group.pages).map((pair) => (
            <View key={pair[0]} style={styles.pair}>
              {pair.map((key) => (
                <Tile key={key} page={key} />
              ))}
            </View>
          ))}
        </View>
      ))}
      {links.groups.map((group) => (
        <View key={group.title} style={{ gap: 12 }}>
          <Text variant="heading" style={styles.section}>{group.title}</Text>
          {group.items.map((item) => (
            <Row key={item.label} icon={item.icon} title={item.label} hint={item.hint} onPress={() => openTarget(item)} />
          ))}
        </View>
      ))}
      <Row icon="Globe02Icon" title={t.explore.site} hint={SITE_URL.replace(/^https?:\/\//, '')} onPress={() => openUrl(`${SITE_URL}/${locale}`)} />
    </>
  );
}

export default function Explore() {
  const [view, setView] = useState<View_>('projects');
  return (
    <Screen title={t.explore.title}>
      <Segmented<View_>
        value={view}
        onChange={setView}
        options={[
          { value: 'projects', label: t.explore.projects },
          { value: 'links', label: t.explore.links },
          { value: 'guide', label: t.explore.guide },
        ]}
      />
      {view === 'projects' ? <Projects /> : view === 'links' ? <Links /> : <Guide />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 16 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  searchInput: { flex: 1, fontFamily: font.regular, fontSize: 16, color: colors.fg, height: 48 },
  // Şeritler ekran kenarına kadar kayar; Screen'in yatay payı geri alınıyor.
  strip: { marginHorizontal: -16 },
  chips: { gap: 8, paddingHorizontal: 16, alignItems: 'center' },
  sep: { width: 1, height: 24, backgroundColor: colors.line, marginHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  // İki sütun: her satırda iki karo, eşit genişlik ve en uzun karonun yüksekliği.
  pair: { flexDirection: 'row', gap: 10 },
  tile: { gap: 6, paddingVertical: 14 },
  tileIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  tileTitle: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20 },
  tileNote: { fontSize: 13, lineHeight: 18 },
});
