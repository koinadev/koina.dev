import { ArrowUpRight01Icon, LiveStreaming01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import type { KoinaEvent, Project } from '@koina/shared/api';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { BlogSummary } from '@/lib/config';
import { resolveUrl } from '@/lib/format';
import { formatDay, sitePaths, t } from '@/lib/i18n';
import { GITHUB_URL } from '@/lib/links';
import { blogQuery, eventsQuery, offlineEvents, projectsQuery, trendingQuery } from '@/lib/queries';
import { useConfig } from '@/lib/use-config';
import { Mark } from './Brand';
import { isLive, RsvpButton, whenLabel } from './EventItem';
import { Icon } from './Icon';
import { ProjectMini } from './ProjectItem';
import { btn, Skeleton } from './ui';

/** Sıradaki (ya da şu an süren) etkinlik. API düşerse haftalık yayınlar yerelde hesaplanır. */
export function useNextEvent(): { event: KoinaEvent | null; pending: boolean } {
  const events = useQuery(eventsQuery);
  if (events.isPending) return { event: null, pending: true };
  const now = new Date();
  const list = events.data?.items ?? offlineEvents();
  return { event: list.find((e) => new Date(e.endsAt) > now) ?? null, pending: false };
}

/** Canlı yayın kutusu: lacivert zemin, sarı düğme; sayfadaki tek koyu blok, göz önce buraya gider. */
export function LiveWidget() {
  const { event, pending } = useNextEvent();
  if (pending) return <Skeleton className="h-40 w-full rounded-3xl" />;
  if (!event) return null;
  const live = isLive(event);
  return (
    <section aria-labelledby="live-title" className="rounded-3xl bg-fg p-5 text-bg">
      <p className="flex items-center gap-2 text-sm font-medium text-bg/75">
        {live ? (
          <span className="inline-flex items-center gap-1.5 font-bold text-white">
            <span className="size-2 animate-pulse rounded-full bg-live" />
            {t.live.now}
          </span>
        ) : (
          <>
            <Icon icon={LiveStreaming01Icon} size={18} className="text-primary" />
            {t.live.next}
          </>
        )}
      </p>
      <h2 id="live-title" className="mt-2 text-xl leading-tight font-bold tracking-[-0.02em]">
        {event.title}
      </h2>
      <p className="mt-1 text-[0.9375rem] text-bg/80">{whenLabel(event.startsAt)}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {live && event.url ? (
          <a href={event.url} target="_blank" rel="noopener noreferrer" className={btn('primary', 'sm')}>
            {t.live.watch}
          </a>
        ) : (
          <RsvpButton event={event} tone="dark" />
        )}
        <span className="text-sm text-bg/70">{t.live.going(event.going)}</span>
      </div>
    </section>
  );
}

/** Öne çıkanlar: önce yayında ve yapılıyor olanlar, sonra kalabalık ekipler. */
export function pickFeatured(projects: Project[], count = 3): Project[] {
  const weight = { shipped: 2, building: 1, idea: 0 } as const;
  return [...projects]
    .sort((a, b) => weight[b.status] - weight[a.status] || b.members - a.members || b.posts - a.posts)
    .slice(0, count);
}

export function FeaturedWidget() {
  const projects = useInfiniteQuery(projectsQuery());
  const featured = pickFeatured(projects.data?.pages[0]?.items ?? []);
  if (projects.isError || (projects.isSuccess && featured.length === 0)) return null;
  return (
    <section aria-labelledby="featured-title" className="rounded-3xl border border-line bg-surface py-3">
      <div className="flex items-baseline justify-between px-4 pb-1">
        <h2 id="featured-title" className="text-lg font-bold tracking-[-0.02em]">
          {t.home.featured}
        </h2>
        <Link to="/kesfet" search={{}} className="text-sm font-medium text-primary-text hover:underline">
          {t.home.allProjects}
        </Link>
      </div>
      {projects.isPending ? (
        <div className="space-y-2 px-4 py-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-10 rounded-xl" />
          ))}
        </div>
      ) : (
        featured.map((p) => <ProjectMini key={p.id} project={p} />)
      )}
    </section>
  );
}

export function BlogMini({ post }: { post: BlogSummary }) {
  return (
    <Link to="/yazilar/$slug" params={{ slug: post.slug }} className="block rounded-xl px-4 py-2.5 transition-colors hover:bg-tint/60">
      <span className="line-clamp-2 text-[0.9375rem] leading-snug font-semibold">{post.title}</span>
      <span className="mt-0.5 block text-[0.8125rem] text-muted">
        {formatDay(post.date)} · {t.blog.minutes(post.minutes)}
      </span>
    </Link>
  );
}

export function BlogWidget() {
  const blog = useQuery(blogQuery);
  if (blog.isError || (blog.isSuccess && !blog.data?.length)) return null;
  return (
    <section aria-labelledby="blog-title" className="py-1">
      <div className="flex items-baseline justify-between px-4 pb-1">
        <h2 id="blog-title" className="text-lg font-bold tracking-[-0.02em]">
          {t.home.fromBlog}
        </h2>
        <Link to="/yazilar" className="text-sm font-medium text-primary-text hover:underline">
          {t.home.allBlog}
        </Link>
      </div>
      {blog.isPending ? (
        <div className="space-y-2 px-4 py-2">
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      ) : (
        (blog.data ?? []).slice(0, 3).map((p) => <BlogMini key={p.slug} post={p} />)
      )}
    </section>
  );
}

/** Tanıtım sitesine dönüş ve küçük künye. */
export function SiteWidget() {
  const { siteUrl } = useConfig();
  const site = (path: string) => resolveUrl(path, siteUrl);
  return (
    <footer className="space-y-3 px-4 pb-6">
      <a
        href={site(sitePaths.home)}
        className="flex items-center gap-3 rounded-2xl bg-tint px-4 py-3 transition-colors hover:bg-tint/70">
        <Mark size={26} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-[0.9375rem] font-semibold">
            {t.common.siteLink}
            <Icon icon={ArrowUpRight01Icon} size={16} />
          </span>
          <span className="block text-[0.8125rem] text-muted">{t.common.siteText}</span>
        </span>
      </a>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-[0.8125rem] text-muted">
        <a href={site(sitePaths.conduct)} className="hover:underline">
          {t.common.conduct}
        </a>
        <a href={site(sitePaths.privacy)} className="hover:underline">
          {t.common.privacy}
        </a>
        <a href={GITHUB_URL} className="hover:underline">
          {t.common.license}
        </a>
      </p>
    </footer>
  );
}

/** Gündemdeki etiketler: son 7 günde en çok farklı kişinin kullandıkları. */
export function TrendingWidget() {
  const trending = useQuery(trendingQuery);
  const items = trending.data?.items.slice(0, 8) ?? [];
  if (trending.isError || (trending.isSuccess && items.length === 0)) return null;
  return (
    <section aria-labelledby="trending-title" className="rounded-3xl border border-line bg-surface py-3">
      <h2 id="trending-title" className="px-4 pb-1 text-lg font-bold tracking-[-0.02em]">
        {t.tags.trending}
      </h2>
      {trending.isPending ? (
        <div className="space-y-2 px-4 py-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-9 rounded-xl" />
          ))}
        </div>
      ) : (
        <ul>
          {items.map((tr) => (
            <li key={tr.tag}>
              <Link to="/etiket/$tag" params={{ tag: tr.tag }} className="block px-4 py-2 transition-colors hover:bg-tint/60">
                <span className="block truncate text-[0.9375rem] font-bold">#{tr.tag}</span>
                <span className="block text-[0.8125rem] text-muted">
                  {t.tags.people(tr.people)} · {t.tags.posts(tr.posts)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Arama kutusu: gönderi araması sayfasına gider. */
export function SearchBox({ initial = '', autoFocus }: { initial?: string; autoFocus?: boolean }) {
  const navigate = useNavigate();
  const [q, setQ] = useState(initial);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const value = q.trim();
        if (value) navigate({ to: '/ara', search: { q: value } });
      }}>
      <label className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-line bg-surface px-4 focus-within:border-primary-text">
        <Icon icon={Search01Icon} size={19} className="text-muted" />
        <span className="sr-only">{t.search.label}</span>
        <input
          type="search"
          value={q}
          autoFocus={autoFocus}
          maxLength={80}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.search.placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-[0.9375rem] placeholder:text-muted focus:outline-none"
        />
      </label>
    </form>
  );
}
