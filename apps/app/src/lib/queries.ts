import type {
  CreateLink,
  CreatePost,
  CreateProject,
  KoinaEvent,
  Link,
  LinkCategory,
  LinkDraft,
  LinkSort,
  Me,
  Member,
  MemberProfile,
  ModAction,
  ModLogEntry,
  ModQueueItem,
  ModTarget,
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
import type { FeatureMap } from '@koina/shared/features';
import { upcomingStreams } from '@koina/shared/schedule';
import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { api, ApiError, request } from './api';
import { getBlogList, getBlogPost } from './config';
import { LIVE_URL } from './links';

function qs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);
  const s = search.toString();
  return s ? `?${s}` : '';
}

function paged<T>(key: readonly unknown[], path: string, params: Record<string, string | undefined> = {}) {
  return infiniteQueryOptions({
    queryKey: key,
    initialPageParam: '',
    queryFn: ({ pageParam }) => api<Page<T>>('GET', `${path}${qs({ ...params, cursor: pageParam || undefined })}`),
    getNextPageParam: (last: Page<T>) => last.next ?? undefined,
  });
}

// ─── Oturum ─────────────────────────────────────────────────────────────────

/** Girişli üye ya da misafir (`null`). 401 hata değil, misafirlik. */
export const featuresQuery = queryOptions({
  queryKey: ['features'],
  queryFn: () => api<FeatureMap>('GET', '/v1/features'),
  staleTime: 60_000,
});

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: async () => {
    try {
      return await api<Me>('GET', '/v1/me');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },
  staleTime: 60_000,
});

// ─── Akış ───────────────────────────────────────────────────────────────────

export interface FeedParams {
  tab?: 'top' | 'following' | 'latest';
  tag?: string;
  project?: string;
  author?: string;
  q?: string;
}

export const feedQuery = (params: FeedParams = {}) => paged<Post>(['feed', params], '/v1/feed', { ...params });

export const threadQuery = (id: string) =>
  queryOptions({ queryKey: ['thread', id], queryFn: () => api<Thread>('GET', `/v1/feed/${encodeURIComponent(id)}`) });

export const trendingQuery = queryOptions({
  queryKey: ['trending'],
  queryFn: () => api<Page<Trend>>('GET', '/v1/tags/trending'),
  staleTime: 5 * 60_000,
});

export const bookmarksQuery = paged<Post>(['bookmarks'], '/v1/me/bookmarks');
export const notificationsQuery = paged<Notification>(['notifications'], '/v1/me/notifications');

type PostPatch = (p: Post) => Post;

/** Önbellekteki her şekilde (sayfalı liste, konu, moderasyon kuyruğu) bir gönderiyi aynı anda günceller. */
export function patchPost(qc: QueryClient, id: string, patch: PostPatch) {
  const fix = (p: Post) => (p.id === id ? patch(p) : p);
  for (const query of qc.getQueryCache().findAll()) {
    const data = query.state.data as unknown;
    if (!data || typeof data !== 'object') continue;
    let next: unknown = data;
    if ('pages' in data) {
      const inf = data as InfiniteData<Page<{ id: string }>>;
      next = { ...inf, pages: inf.pages.map((page) => ({ ...page, items: page.items.map((x) => ('author' in x && 'body' in x ? fix(x as Post) : x)) })) };
    } else if ('post' in data && 'replies' in data) {
      const th = data as Thread;
      next = { ancestors: th.ancestors.map(fix), post: fix(th.post), replies: th.replies.map(fix) };
    } else continue;
    qc.setQueryData(query.queryKey, next);
  }
}

export type Reaction = 'clap' | 'repost' | 'bookmark';

const reactionPatch: Record<Reaction, (on: boolean) => PostPatch> = {
  clap: (on) => (p) => (p.clapped === on ? p : { ...p, clapped: on, claps: Math.max(0, p.claps + (on ? 1 : -1)) }),
  repost: (on) => (p) => (p.reposted === on ? p : { ...p, reposted: on, reposts: Math.max(0, p.reposts + (on ? 1 : -1)) }),
  bookmark: (on) => (p) => ({ ...p, bookmarked: on }),
};

/** Alkış, yeniden paylaşım, kaydetme: iyimser; hata olursa sunucudaki gerçek yeniden çekilir. */
export function useReact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, kind, on }: { id: string; kind: Reaction; on: boolean }) =>
      api(on ? 'POST' : 'DELETE', `/v1/feed/${encodeURIComponent(id)}/${kind}`),
    onMutate: ({ id, kind, on }) => patchPost(qc, id, reactionPatch[kind](on)),
    onError: () => qc.invalidateQueries({ predicate: (q) => ['feed', 'thread', 'bookmarks'].includes(String(q.queryKey[0])) }),
    onSuccess: (_d, { kind }) => {
      if (kind === 'bookmark') qc.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePost) => api<Post>('POST', '/v1/feed', input),
    onSuccess: (post) => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      if (post.parentId) {
        // Yanıt, açık olan konuya hemen eklenir; sayaç her yerde bir artar.
        qc.setQueryData<Thread>(['thread', post.parentId], (th) => th && { ...th, replies: [...th.replies.filter((r) => r.id !== post.id), post] });
        patchPost(qc, post.parentId, (p) => ({ ...p, replies: p.replies + 1 }));
      }
      if (post.quote) patchPost(qc, post.quote.id, (p) => ({ ...p, quotes: p.quotes + 1 }));
      qc.invalidateQueries({ queryKey: ['member'] });
      qc.invalidateQueries({ queryKey: ['trending'] });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api('DELETE', `/v1/feed/${encodeURIComponent(id)}`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['bookmarks'] });
      // Silinen gönderinin kendi sayfası yeniden çekilmez: açıksa bir an "bulunamadı" gösterirdi.
      qc.invalidateQueries({ queryKey: ['thread'], predicate: (q) => q.queryKey[1] !== id });
      qc.removeQueries({ queryKey: ['thread', id], type: 'inactive' });
      qc.invalidateQueries({ queryKey: ['member'] });
    },
  });
}

/** `POST /v1/media`: görseli tek tek yükler; ölçüleri istemci okur (sunucu yalnız denetler). */
export function uploadMedia(file: File, size: { width: number; height: number }, alt: string) {
  const form = new FormData();
  form.set('file', file);
  form.set('width', String(size.width));
  form.set('height', String(size.height));
  form.set('alt', alt);
  return request<PostMedia>('POST', '/v1/media', { form });
}

export function useReport() {
  return useMutation({
    mutationFn: ({ target, id, reason, note }: { target: 'post' | 'link' | 'user'; id: string; reason: ReportReason; note: string }) => {
      const base = target === 'post' ? '/v1/feed' : target === 'link' ? '/v1/links' : '/v1/members';
      return api('POST', `${base}/${encodeURIComponent(id)}/report`, { reason, note });
    },
  });
}

// ─── Takvim ─────────────────────────────────────────────────────────────────

/** API'ye ulaşılamazsa takvim boş kalmasın: haftalık yayınlar yerelde de hesaplanabiliyor. */
export function offlineEvents(): KoinaEvent[] {
  return upcomingStreams(new Date(), 6).map((s) => ({
    id: s.id,
    kind: 'stream',
    title: s.slot.title.tr,
    description: '',
    startsAt: s.start.toISOString(),
    endsAt: s.end.toISOString(),
    url: LIVE_URL,
    going: 0,
  }));
}

export const eventsQuery = queryOptions({
  queryKey: ['events'],
  queryFn: () => api<Page<KoinaEvent>>('GET', '/v1/events?locale=tr'),
  staleTime: 60_000,
});

export function useRsvp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, going }: { id: string; going: boolean }) =>
      api(going ? 'POST' : 'DELETE', `/v1/events/${encodeURIComponent(id)}/rsvp`),
    onMutate: async ({ id, going }) => {
      await qc.cancelQueries({ queryKey: ['events'] });
      const prev = qc.getQueryData<Page<KoinaEvent>>(['events']);
      qc.setQueryData<Page<KoinaEvent>>(['events'], (old) =>
        old && {
          ...old,
          items: old.items.map((e) => (e.id === id && e.me !== going ? { ...e, me: going, going: Math.max(0, e.going + (going ? 1 : -1)) } : e)),
        },
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['events'], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });
}

// ─── Projeler ───────────────────────────────────────────────────────────────

export const projectsQuery = (filters: ProjectFilters = {}) => paged<Project>(['projects', filters], '/v1/projects', { ...filters });

export const projectQuery = (slug: string) =>
  queryOptions({ queryKey: ['project', slug], queryFn: () => api<Project>('GET', `/v1/projects/${encodeURIComponent(slug)}`) });

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProject) => api<Project>('POST', '/v1/projects', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['member'] });
    },
  });
}

export function useJoinProject(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (join: boolean) => api(join ? 'POST' : 'DELETE', `/v1/projects/${encodeURIComponent(slug)}/join`),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['project', slug] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['member'] });
    },
  });
}

// ─── Üyeler ─────────────────────────────────────────────────────────────────

export const memberQuery = (handle: string) =>
  queryOptions({
    queryKey: ['member', handle],
    queryFn: () => api<MemberProfile>('GET', `/v1/members/${encodeURIComponent(handle)}`),
  });

export function useFollow(handle: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (follow: boolean) => api(follow ? 'POST' : 'DELETE', `/v1/members/${encodeURIComponent(handle)}/follow`),
    onMutate: (follow) =>
      qc.setQueryData<MemberProfile>(['member', handle], (old) =>
        old && old.followed !== follow
          ? { ...old, followed: follow, stats: { ...old.stats, followers: Math.max(0, old.stats.followers + (follow ? 1 : -1)) } }
          : old,
      ),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['member'] });
      qc.invalidateQueries({ queryKey: ['feed', { tab: 'following' }] });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfile) => api<Member>('PATCH', '/v1/me', input),
    onSuccess: () => {
      // Ad ya da kullanıcı adı gönderilerde ve ekip listelerinde de görünüyor.
      qc.invalidateQueries();
    },
  });
}

export const useDeleteAccount = () => useMutation({ mutationFn: () => api('DELETE', '/v1/me') });

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api('POST', '/v1/me/notifications/read'),
    onSuccess: () => qc.setQueryData<Me | null>(['me'], (me) => (me ? { ...me, unread: 0 } : me)),
  });
}

// ─── Faydalı bağlantılar ────────────────────────────────────────────────────

export interface LinkParams {
  sort?: LinkSort;
  category?: LinkCategory;
  tag?: string;
  q?: string;
}

export const linksQuery = (params: LinkParams = {}) => paged<Link>(['links', params], '/v1/links', { ...params });

export const linkQuery = (id: string) =>
  queryOptions({ queryKey: ['link', id], queryFn: () => api<Link>('GET', `/v1/links/${encodeURIComponent(id)}`) });

export const linkTagsQuery = queryOptions({
  queryKey: ['linkTags'],
  queryFn: () => api<Page<{ tag: string; links: number }>>('GET', '/v1/links/tags'),
  staleTime: 5 * 60_000,
});

function patchLink(qc: QueryClient, id: string, patch: (l: Link) => Link) {
  qc.setQueriesData<InfiniteData<Page<Link>>>({ queryKey: ['links'] }, (old) =>
    old && { ...old, pages: old.pages.map((p) => ({ ...p, items: p.items.map((l) => (l.id === id ? patch(l) : l)) })) },
  );
  qc.setQueryData<Link>(['link', id], (old) => old && patch(old));
}

export function useVoteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => api(on ? 'POST' : 'DELETE', `/v1/links/${encodeURIComponent(id)}/vote`),
    onMutate: ({ id, on }) => patchLink(qc, id, (l) => (l.voted === on ? l : { ...l, voted: on, votes: Math.max(0, l.votes + (on ? 1 : -1)) })),
    onError: () => qc.invalidateQueries({ queryKey: ['links'] }),
  });
}

export const usePreviewLink = () => useMutation({ mutationFn: (url: string) => api<LinkDraft>('POST', '/v1/links/preview', { url }) });

export function useCreateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLink) => api<Link>('POST', '/v1/links', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['links'] });
      qc.invalidateQueries({ queryKey: ['linkTags'] });
    },
  });
}

export function useDeleteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api('DELETE', `/v1/links/${encodeURIComponent(id)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links'] }),
  });
}

// ─── Moderasyon ─────────────────────────────────────────────────────────────

/** `GET /v1/mod/log` satırı. Sözleşmede tipi yok (packages/db'deki `ModerationLogEntry`); burada aynası. */
export const modQueueQuery = queryOptions({ queryKey: ['mod', 'queue'], queryFn: () => api<Page<ModQueueItem>>('GET', '/v1/mod/queue') });
export const modLogQuery = queryOptions({ queryKey: ['mod', 'log'], queryFn: () => api<Page<ModLogEntry>>('GET', '/v1/mod/log') });

export function useModAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { targetKind: ModTarget; targetId: string; action: ModAction; reason: string }) => api('POST', '/v1/mod/actions', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mod'] });
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['links'] });
    },
  });
}

// ─── Blog (site) ────────────────────────────────────────────────────────────

export const blogQuery = queryOptions({ queryKey: ['blog'], queryFn: () => getBlogList(), staleTime: 10 * 60_000 });
export const blogPostQuery = (slug: string) =>
  queryOptions({ queryKey: ['blogPost', slug], queryFn: () => getBlogPost({ data: slug }), staleTime: 10 * 60_000 });
