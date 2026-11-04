import type {
  BlogFeed,
  CreateLink,
  CreatePost,
  CreateProject,
  FeedQuery,
  KoinaEvent,
  Link,
  LinkCategory,
  LinkDraft,
  LinkSort,
  Me,
  MemberProfile,
  Notification,
  Page,
  Post,
  PostMedia,
  Project,
  ProjectFilters,
  ReportReason,
  Thread,
  Trend,
  UpdateProfile,
} from '@koina/shared/api';
import { upcomingStreams } from '@koina/shared/schedule';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { api, upload } from './api';
import { fetchBlog } from './blog';
import { locale } from './i18n';

/** API'ye ulaşılamazsa takvim boş kalmasın: haftalık yayınlar yerelde de hesaplanabiliyor. */
export function offlineEvents(): KoinaEvent[] {
  return upcomingStreams(new Date(), 6).map((s) => ({
    id: s.id,
    kind: 'stream',
    title: s.slot.title[locale],
    description: '',
    startsAt: s.start.toISOString(),
    endsAt: s.end.toISOString(),
    url: 'https://www.youtube.com/@koinadev/live',
    going: 0,
  }));
}

/** Boş değerleri atıp sorgu dizgesi kurar: `?a=1&b=2` ya da boş dizge. */
function query(params: Record<string, string | undefined | null>): string {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
  return qs ? `?${qs}` : '';
}

export const useEvents = () =>
  useQuery({ queryKey: ['events'], queryFn: () => api<Page<KoinaEvent>>('GET', `/v1/events?locale=${locale}`) });

export function useRsvp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, going }: { id: string; going: boolean }) =>
      api(going ? 'POST' : 'DELETE', `/v1/events/${id}/rsvp`),
    // İyimser güncelleme: düğme anında değişir, hata olursa geri alınır.
    onMutate: async ({ id, going }) => {
      await qc.cancelQueries({ queryKey: ['events'] });
      const prev = qc.getQueryData<Page<KoinaEvent>>(['events']);
      qc.setQueryData<Page<KoinaEvent>>(['events'], (old) =>
        old && {
          ...old,
          items: old.items.map((e) => (e.id === id ? { ...e, me: going, going: e.going + (going ? 1 : -1) } : e)),
        },
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['events'], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });
}

/** İmleçli liste. İmleç opak dizgedir; ilk sayfada hiç gönderilmez. */
function paged<T>(key: unknown[], path: string) {
  return {
    queryKey: key,
    initialPageParam: '',
    queryFn: ({ pageParam }: { pageParam: string }) =>
      api<Page<T>>('GET', pageParam ? `${path}${path.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(pageParam)}` : path),
    getNextPageParam: (last: Page<T>) => last.next ?? undefined,
  };
}

/** Sayfaları tek listeye indirir; aynı kimlik iki sayfada gelirse ilki kalır. */
export function flatten<T extends { id: string }>(data: InfiniteData<Page<T>> | undefined): T[] {
  const seen = new Set<string>();
  return (data?.pages ?? []).flatMap((p) => p.items).filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

// ─── Akış ───────────────────────────────────────────────────────────────────

/** Akış: sekme (`top`, `following`, `latest`) ya da `tag`, `project`, `author`, `q`, `scope` süzgeçleri. */
export function useFeed(filter: FeedQuery = {}, enabled = true) {
  const qs = query({ ...filter });
  return useInfiniteQuery({ ...paged<Post>(['feed', qs], `/v1/feed${qs}`), enabled });
}
export const useThread = (id: string | undefined) =>
  useQuery({ queryKey: ['thread', id], queryFn: () => api<Thread>('GET', `/v1/feed/${id}`), enabled: !!id });
export const useTrending = () =>
  useQuery({ queryKey: ['trending'], queryFn: () => api<Page<Trend>>('GET', '/v1/tags/trending'), staleTime: 5 * 60_000 });
export const useBookmarks = (enabled = true) => useInfiniteQuery({ ...paged<Post>(['bookmarks'], '/v1/me/bookmarks'), enabled });

/**
 * Önbellekteki her gönderi kopyasını (akış sayfaları, konu, kaydedilenler) yerinde değiştirir. Aynı gönderi birkaç
 * listede birden durabildiği için alkış gibi bir değişiklik hepsine aynı anda yansır.
 */
function patchPosts(qc: QueryClient, id: string, fn: (p: Post) => Post) {
  const map = (p: Post) => (p.id === id ? fn(p) : p);
  const pages = (old: InfiniteData<Page<Post>> | undefined) =>
    old && { ...old, pages: old.pages.map((pg) => ({ ...pg, items: pg.items.map(map) })) };
  qc.setQueriesData<InfiniteData<Page<Post>>>({ queryKey: ['feed'] }, pages);
  qc.setQueriesData<InfiniteData<Page<Post>>>({ queryKey: ['bookmarks'] }, pages);
  qc.setQueriesData<Thread>({ queryKey: ['thread'] }, (old) =>
    old && { ancestors: old.ancestors.map(map), post: map(old.post), replies: old.replies.map(map) },
  );
}

export type Reaction = 'clap' | 'repost' | 'bookmark';

function applyReaction(p: Post, kind: Reaction, on: boolean): Post {
  const d = on ? 1 : -1;
  if (kind === 'clap') return p.clapped === on ? p : { ...p, clapped: on, claps: Math.max(0, p.claps + d) };
  if (kind === 'repost') return p.reposted === on ? p : { ...p, reposted: on, reposts: Math.max(0, p.reposts + d) };
  return { ...p, bookmarked: on };
}

/** Alkış, yeniden paylaşım ve kaydetme: iyimser; hata olursa geri alınır. */
export function useReact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, kind, on }: { id: string; kind: Reaction; on: boolean }) =>
      api(on ? 'POST' : 'DELETE', `/v1/feed/${id}/${kind}`),
    onMutate: ({ id, kind, on }) => patchPosts(qc, id, (p) => applyReaction(p, kind, on)),
    onError: (_e, { id, kind, on }) => patchPosts(qc, id, (p) => applyReaction(p, kind, !on)),
    onSuccess: (_d, { kind }) => {
      if (kind === 'bookmark') qc.invalidateQueries({ queryKey: ['bookmarks'] });
      if (kind === 'clap') qc.invalidateQueries({ queryKey: ['member'] });
      // Takip akışında yeniden paylaşımlar da görünür; yeniden çekilince yerine oturur.
      if (kind === 'repost') qc.invalidateQueries({ queryKey: ['feed', '?tab=following'] });
    },
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePost) => api<Post>('POST', '/v1/feed', input),
    onSuccess: (post) => {
      // Yanıt, açık duran gönderi sayfasına beklemeden eklenir; ardından her şey tazelenir.
      if (post.parentId) {
        qc.setQueryData<Thread>(['thread', post.parentId], (old) =>
          old && { ...old, post: { ...old.post, replies: old.post.replies + 1 }, replies: [...old.replies, post] },
        );
        patchPosts(qc, post.parentId, (p) => ({ ...p, replies: p.replies + 1 }));
      }
      if (post.quote) patchPosts(qc, post.quote.id, (p) => ({ ...p, quotes: p.quotes + 1 }));
      return Promise.all(['feed', 'thread', 'member', 'trending'].map((key) => qc.invalidateQueries({ queryKey: [key] })));
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api('DELETE', `/v1/feed/${id}`),
    onSuccess: () => Promise.all(['feed', 'thread', 'member', 'bookmarks'].map((key) => qc.invalidateQueries({ queryKey: [key] }))),
  });
}

/** Seçilen görsel: yerel adres ve boyutlar; yükleme sonrası API'nin verdiği kimlik. */
export interface LocalImage {
  uri: string;
  width: number;
  height: number;
  mimeType?: string | null;
  fileName?: string | null;
  alt: string;
}

/** `POST /v1/media`: çok parçalı form; `{ uri, name, type }` parçasını React Native dosya olarak gönderir. */
export async function uploadMedia(image: LocalImage): Promise<PostMedia> {
  const type = image.mimeType || 'image/jpeg';
  const ext = type.split('/')[1] ?? 'jpg';
  const form = new FormData();
  form.append('file', { uri: image.uri, name: image.fileName || `image.${ext}`, type } as unknown as Blob);
  form.append('width', String(Math.round(image.width)));
  form.append('height', String(Math.round(image.height)));
  form.append('alt', image.alt.trim());
  return upload<PostMedia>('/v1/media', form);
}

export type ReportTarget = 'post' | 'link' | 'member';
const reportPath = { post: '/v1/feed', link: '/v1/links', member: '/v1/members' } as const;

export function useReport() {
  return useMutation({
    mutationFn: ({ target, id, reason, note = '' }: { target: ReportTarget; id: string; reason: ReportReason; note?: string }) =>
      api('POST', `${reportPath[target]}/${id}/report`, { reason, note }),
  });
}

// ─── Bildirimler ────────────────────────────────────────────────────────────

export const useNotifications = (enabled = true) =>
  useInfiniteQuery({ ...paged<Notification>(['notifications'], '/v1/me/notifications'), enabled });

export function useMarkRead() {
  return useMutation({ mutationFn: () => api('POST', '/v1/me/notifications/read', {}) });
}

// ─── Projeler ve üyeler ─────────────────────────────────────────────────────

export function useProjects(filters: ProjectFilters = {}, enabled = true) {
  const qs = query({ ...filters });
  return useInfiniteQuery({ ...paged<Project>(['projects', qs], `/v1/projects${qs}`), enabled });
}
export const useProject = (slug: string) =>
  useQuery({ queryKey: ['project', slug], queryFn: () => api<Project>('GET', `/v1/projects/${slug}`) });
export const useMember = (handle: string | undefined) =>
  useQuery({
    queryKey: ['member', handle],
    queryFn: () => api<MemberProfile>('GET', `/v1/members/${handle}`),
    enabled: !!handle,
  });

/** Takip et / bırak: düğme ve takipçi sayısı anında değişir. */
export function useFollow(handle: string) {
  const qc = useQueryClient();
  const patch = (on: boolean) =>
    qc.setQueryData<MemberProfile>(['member', handle], (old) =>
      old && old.followed !== on
        ? { ...old, followed: on, stats: { ...old.stats, followers: Math.max(0, old.stats.followers + (on ? 1 : -1)) } }
        : old,
    );
  return useMutation({
    mutationFn: (on: boolean) => api(on ? 'POST' : 'DELETE', `/v1/members/${handle}/follow`),
    onMutate: (on) => patch(on),
    onError: (_e, on) => patch(!on),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed', '?tab=following'] }),
  });
}

/** Blog yazıları siteden gelir; yeni yazı için uygulama güncellemesi gerekmez. */
export const useBlog = () =>
  useQuery<BlogFeed>({ queryKey: ['blog', locale], queryFn: fetchBlog, staleTime: 10 * 60_000 });

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProject) => api<Project>('POST', '/v1/projects', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useJoinProject(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (join: boolean) => api(join ? 'POST' : 'DELETE', `/v1/projects/${slug}/join`),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['project', slug] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['member'] });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfile) => api<Me>('PATCH', '/v1/me', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member'] }),
  });
}

// ─── Faydalı bağlantılar ────────────────────────────────────────────────────

export interface LinkFilters {
  sort?: LinkSort;
  category?: LinkCategory;
  tag?: string;
  q?: string;
}

export function useLinks(filters: LinkFilters = {}, enabled = true) {
  const qs = query({ ...filters });
  return useInfiniteQuery({ ...paged<Link>(['links', qs], `/v1/links${qs}`), enabled });
}
export const useLink = (id: string | undefined) =>
  useQuery({ queryKey: ['link', id], queryFn: () => api<Link>('GET', `/v1/links/${id}`), enabled: !!id });

export function useLinkPreview() {
  return useMutation({ mutationFn: (url: string) => api<LinkDraft>('POST', '/v1/links/preview', { url }) });
}

export function useCreateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLink) => api<Link>('POST', '/v1/links', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links'] }),
  });
}

function patchLinks(qc: QueryClient, id: string, fn: (l: Link) => Link) {
  const map = (l: Link) => (l.id === id ? fn(l) : l);
  qc.setQueriesData<InfiniteData<Page<Link>>>({ queryKey: ['links'] }, (old) =>
    old && { ...old, pages: old.pages.map((pg) => ({ ...pg, items: pg.items.map(map) })) },
  );
  qc.setQueryData<Link>(['link', id], (old) => old && map(old));
}

/** "İşe yarar" oyu: iyimser. */
export function useVoteLink() {
  const qc = useQueryClient();
  const apply = (l: Link, on: boolean): Link => (l.voted === on ? l : { ...l, voted: on, votes: Math.max(0, l.votes + (on ? 1 : -1)) });
  return useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => api(on ? 'POST' : 'DELETE', `/v1/links/${id}/vote`),
    onMutate: ({ id, on }) => patchLinks(qc, id, (l) => apply(l, on)),
    onError: (_e, { id, on }) => patchLinks(qc, id, (l) => apply(l, !on)),
  });
}

export function useDeleteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api('DELETE', `/v1/links/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links'] }),
  });
}
