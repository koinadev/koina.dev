import {
  Bookmark02Icon,
  BookmarkCheck02Icon,
  BubbleChatIcon,
  Clapping02Icon,
  Copy01Icon,
  Delete02Icon,
  Flag02Icon,
  MoreHorizontalIcon,
  QuoteDownIcon,
  RepeatIcon,
  Share08Icon,
  ViewOffSlashIcon,
} from '@hugeicons/core-free-icons';
import type { LinkPreview, Post, PostMedia, QuotedPost } from '@koina/shared/api';
import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import type { MouseEvent, ReactNode } from 'react';
import { richText } from '@/lib/format';
import { errorText, formatFull, formatNumber, t, timeAgo } from '@/lib/i18n';
import { UGC_REL } from '@/lib/links';
import { useDeletePost, useReact, type Reaction } from '@/lib/queries';
import { isModerator, useMe, useRequireAuth } from '@/lib/session';
import { Avatar } from './Avatar';
import { Icon, type IconSvgElement } from './Icon';
import { Menu } from './Menu';
import { useOverlays } from './overlays';
import { RoleBadge } from './ui';

const stop = (e: MouseEvent) => e.stopPropagation();

/** Gönderi metni: satır sonları korunur; bağlantı, etiket ve anma tıklanır. HTML hiç yorumlanmaz. */
export function PostBody({ body, large }: { body: string; large?: boolean }) {
  if (!body) return null;
  return (
    <p className={`break-anywhere whitespace-pre-wrap ${large ? 'text-[1.1875rem] leading-relaxed' : 'text-[0.9375rem] leading-normal'}`}>
      {richText(body).map((s, i) => {
        if (s.kind === 'url')
          return (
            <a key={i} href={s.href} target="_blank" rel={UGC_REL} onClick={stop} className="text-primary-text hover:underline">
              {s.value}
            </a>
          );
        if (s.kind === 'tag')
          return (
            <Link key={i} to="/etiket/$tag" params={{ tag: s.tag }} onClick={stop} className="text-primary-text hover:underline">
              {s.value}
            </Link>
          );
        if (s.kind === 'mention')
          return (
            <Link key={i} to="/u/$handle" params={{ handle: s.handle }} onClick={stop} className="text-primary-text hover:underline">
              {s.value}
            </Link>
          );
        return s.value;
      })}
    </p>
  );
}

/** Zaman: sunucu ve tarayıcı saati bir dakika farklı olabilir, hidrasyon uyarısı bu yüzden bastırılır. */
export function Ago({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={formatFull(iso)} suppressHydrationWarning>
      {timeAgo(iso)}
    </time>
  );
}

/** 1–4 görsel: X'teki gibi ızgara; tıklayınca büyük açılır. Ölçüler bilindiği için yüklenirken sayfa zıplamaz. */
export function MediaGrid({ media, compact }: { media: PostMedia[]; compact?: boolean }) {
  const { lightbox } = useOverlays();
  if (media.length === 0) return null;
  const one = media.length === 1;
  const first = media[0]!;
  const ratio = one ? Math.min(Math.max(first.width / first.height, 0.75), 2) : 16 / 9;
  return (
    <div
      className={`mt-2.5 grid gap-0.5 overflow-hidden rounded-2xl border border-line ${one ? '' : 'grid-cols-2'} ${media.length > 2 ? 'grid-rows-2' : ''}`}
      style={compact ? { height: 180 } : { aspectRatio: String(ratio), maxHeight: 520 }}>
      {media.map((m, i) => (
        <button
          key={m.id}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            lightbox(media, i);
          }}
          aria-label={m.alt ? `${t.feed.openImage}: ${m.alt}` : t.feed.openImage}
          className={`relative min-h-0 overflow-hidden bg-tint ${media.length === 3 && i === 0 ? 'row-span-2' : ''}`}>
          <img src={m.url} alt={m.alt} width={m.width} height={m.height} loading="lazy" decoding="async" className="size-full object-cover" />
          {m.alt && <span className="absolute bottom-1.5 left-1.5 rounded bg-ink/75 px-1.5 text-[0.6875rem] font-bold text-bg">ALT</span>}
        </button>
      ))}
    </div>
  );
}

/** Bağlantı kartı: sunucunun okuduğu og verisi. Kullanıcı içeriği: `ugc nofollow`. */
export function PreviewCard({ preview }: { preview: LinkPreview }) {
  let host = preview.siteName;
  try {
    host = new URL(preview.url).hostname.replace(/^www\./, '');
  } catch {
    /* bozuk adres: site adı yeter */
  }
  return (
    <a
      href={preview.url}
      target="_blank"
      rel={UGC_REL}
      onClick={stop}
      className="mt-2.5 flex overflow-hidden rounded-2xl border border-line transition-colors hover:bg-bg/70 max-[420px]:flex-col">
      {preview.image && (
        <img
          src={preview.image}
          alt=""
          loading="lazy"
          className="aspect-[1.91] w-full shrink-0 border-line object-cover min-[421px]:aspect-square min-[421px]:w-28 min-[421px]:border-r max-[420px]:border-b"
        />
      )}
      <span className="flex min-w-0 flex-col justify-center gap-0.5 px-3.5 py-2.5">
        <span className="truncate text-[0.8125rem] text-muted">{host}</span>
        <span className="line-clamp-2 text-[0.9375rem] leading-snug font-semibold">{preview.title || preview.url}</span>
        {preview.description && <span className="line-clamp-2 text-sm text-muted">{preview.description}</span>}
      </span>
    </a>
  );
}

/** Alıntılanan gönderi: küçük çerçeve; gizlendiyse yerinde not. */
export function QuoteEmbed({ quote, interactive = true }: { quote: QuotedPost; interactive?: boolean }) {
  const navigate = useNavigate();
  if (quote.unavailable)
    return <div className="mt-2.5 rounded-2xl border border-line bg-bg px-4 py-3 text-sm text-muted">{t.feed.unavailable}</div>;
  const open = (e: MouseEvent) => {
    e.stopPropagation();
    if (interactive) navigate({ to: '/akis/$id', params: { id: quote.id } });
  };
  return (
    <div
      role={interactive ? 'link' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={open}
      onKeyDown={(e) => e.key === 'Enter' && interactive && navigate({ to: '/akis/$id', params: { id: quote.id } })}
      className={`mt-2.5 block rounded-2xl border border-line px-3.5 py-2.5 ${interactive ? 'cursor-pointer transition-colors hover:bg-bg/70' : ''}`}>
      <div className="flex min-w-0 items-center gap-1.5 text-sm">
        <Avatar name={quote.author.name} handle={quote.author.handle} size={20} />
        <span className="truncate font-bold">{quote.author.name}</span>
        <span className="truncate text-muted">@{quote.author.handle}</span>
        <span aria-hidden className="text-muted">
          ·
        </span>
        <span className="shrink-0 text-muted">
          <Ago iso={quote.createdAt} />
        </span>
      </div>
      {quote.body && <p className="mt-1 line-clamp-4 text-[0.9375rem] leading-normal whitespace-pre-wrap break-anywhere">{quote.body}</p>}
      {quote.media.length > 0 && <MediaGrid media={quote.media} compact />}
    </div>
  );
}

function Action({ icon, label, count, active, onClick, tone = 'hover:text-primary-text', activeTone = 'bg-primary group-hover:bg-primary', ...rest }: {
  icon: IconSvgElement;
  label: string;
  count?: number;
  active?: boolean;
  onClick: (e: MouseEvent) => void;
  tone?: string;
  activeTone?: string;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: 'menu';
  'aria-controls'?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={rest['aria-haspopup'] ? undefined : active}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      {...rest}
      className={`group inline-flex h-9 min-w-0 items-center gap-0.5 rounded-full text-sm tabular-nums transition-colors ${tone} ${
        active ? 'font-semibold text-fg' : 'text-muted'
      }`}>
      <span className={`flex size-8 items-center justify-center rounded-full transition-colors group-hover:bg-tint ${active ? activeTone : ''}`}>
        <Icon icon={icon} size={18} />
      </span>
      {count !== undefined && count > 0 && <span className="pr-1">{formatNumber(count)}</span>}
    </button>
  );
}

function useShare() {
  const { toast } = useOverlays();
  return async (post: Post) => {
    const url = `${window.location.origin}/akis/${post.id}`;
    if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ url, title: `${post.author.name} · koina.dev` });
        return;
      } catch {
        /* vazgeçildi: panoya düş */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast(t.feed.copied);
    } catch {
      // Pano izni yoksa (eski tarayıcı, http) adresi göster; elle kopyalanabilsin.
      window.prompt(t.feed.copyLink, url);
    }
  };
}

function Meta({ post, large }: { post: Post; large?: boolean }) {
  const role = post.author.roles[0];
  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.9375rem] ${large ? 'flex-col items-start' : ''}`}>
      <span className="flex min-w-0 items-center gap-1.5">
        <Link to="/u/$handle" params={{ handle: post.author.handle }} onClick={stop} className="truncate font-bold hover:underline">
          {post.author.name}
        </Link>
        {role && <RoleBadge role={role} />}
      </span>
      <span className="flex min-w-0 items-center gap-1.5 text-muted">
        <Link to="/u/$handle" params={{ handle: post.author.handle }} onClick={stop} className="truncate">
          @{post.author.handle}
        </Link>
        {!large && (
          <>
            <span aria-hidden>·</span>
            <Link to="/akis/$id" params={{ id: post.id }} onClick={stop} className="shrink-0 hover:underline">
              <Ago iso={post.createdAt} />
            </Link>
          </>
        )}
      </span>
    </div>
  );
}

export function Actions({ post }: { post: Post }) {
  const me = useMe();
  const requireAuth = useRequireAuth();
  const react = useReact();
  const remove = useDeletePost();
  const share = useShare();
  const { confirm, toast, compose, report } = useOverlays();
  const router = useRouter();
  const canDelete = me && (me.handle === post.author.handle || isModerator(me));

  const toggle = (kind: Reaction, on: boolean, done?: string) =>
    requireAuth(() =>
      react.mutate(
        { id: post.id, kind, on },
        { onSuccess: () => done && toast(done), onError: (err) => toast(errorText(err)) },
      ),
    );

  const more = [
    { label: t.feed.copyLink, icon: Copy01Icon, onSelect: () => share(post) },
    ...(me && me.handle !== post.author.handle ? [{ label: t.feed.report, icon: Flag02Icon, onSelect: () => report({ target: 'post' as const, id: post.id }) }] : []),
    ...(canDelete
      ? [
          {
            label: t.feed.delete,
            icon: Delete02Icon,
            danger: true,
            onSelect: async () => {
              if (!(await confirm(t.feed.deleteConfirm, { action: t.feed.delete, danger: true }))) return;
              remove.mutate(post.id, {
                onSuccess: () => {
                  toast(t.feed.deleted);
                  // Gönderi kendi sayfasında silindiyse sayfa boşa düşmesin.
                  if (window.location.pathname === `/akis/${post.id}`) router.navigate({ to: '/home', replace: true });
                },
                onError: (err) => toast(errorText(err)),
              });
            },
          },
        ]
      : []),
  ];

  return (
    <div className="-mx-1.5 mt-1 flex items-center justify-between gap-0.5 sm:max-w-md">
      <Action
        icon={BubbleChatIcon}
        label={`${t.feed.reply} (${t.feed.replyCount(post.replies)})`}
        count={post.replies}
        onClick={() => requireAuth(() => compose({ replyTo: post }))}
      />
      <Menu
        align="left"
        items={[
          {
            label: post.reposted ? t.feed.unrepost : t.feed.repost,
            icon: RepeatIcon,
            onSelect: () => toggle('repost', !post.reposted),
          },
          { label: t.feed.quote, icon: QuoteDownIcon, onSelect: () => requireAuth(() => compose({ quote: post })) },
        ]}
        trigger={(p) => (
          <Action
            {...p}
            icon={RepeatIcon}
            label={`${t.feed.repost} (${t.feed.reposts(post.reposts + post.quotes)})`}
            count={post.reposts + post.quotes}
            active={!!post.reposted}
            activeTone="bg-squiggle group-hover:bg-squiggle"
            tone="hover:text-fg"
            onClick={() => (me ? p.onClick() : requireAuth(() => undefined))}
          />
        )}
      />
      <Action
        icon={Clapping02Icon}
        label={post.clapped ? t.feed.unclap : `${t.feed.clap} (${t.feed.claps(post.claps)})`}
        count={post.claps}
        active={!!post.clapped}
        onClick={() => toggle('clap', !post.clapped)}
        tone="hover:text-fg"
      />
      <Action
        icon={post.bookmarked ? BookmarkCheck02Icon : Bookmark02Icon}
        label={post.bookmarked ? t.feed.unbookmark : t.feed.bookmark}
        active={!!post.bookmarked}
        activeTone="bg-tint group-hover:bg-tint"
        onClick={() => toggle('bookmark', !post.bookmarked, post.bookmarked ? t.feed.unbookmarked : t.feed.bookmarked)}
      />
      <Action icon={Share08Icon} label={t.feed.share} onClick={() => share(post)} />
      <Menu
        items={more}
        trigger={(p) => <Action {...p} icon={MoreHorizontalIcon} label={t.feed.more} onClick={p.onClick} />}
      />
    </div>
  );
}

function HiddenNotice() {
  return (
    <p className="mt-2 flex items-center gap-2 rounded-xl bg-danger-bg px-3 py-2 text-sm">
      <Icon icon={ViewOffSlashIcon} size={16} className="shrink-0 text-live" />
      {t.feed.hidden}
    </p>
  );
}

function Attachments({ post }: { post: Post }) {
  return (
    <>
      <MediaGrid media={post.media} />
      {post.preview && post.media.length === 0 && <PreviewCard preview={post.preview} />}
      {post.quote && <QuoteEmbed quote={post.quote} />}
      {post.project && (
        <Link
          to="/proje/$slug"
          params={{ slug: post.project.slug }}
          onClick={stop}
          className="mt-2.5 inline-flex max-w-full items-center rounded-full bg-tint px-2.5 py-0.5 text-sm font-medium text-primary-text hover:underline">
          <span className="truncate">◆ {post.project.name}</span>
        </Link>
      )}
    </>
  );
}

/** Akış satırı: kartsız, ince çizgiyle ayrılmış; tıklayınca gönderi sayfası açılır. */
export function PostItem({ post, header, connector }: { post: Post; header?: ReactNode; connector?: boolean }) {
  const navigate = useNavigate();
  const open = () => navigate({ to: '/akis/$id', params: { id: post.id } });
  return (
    <article
      className={`flex cursor-pointer gap-3 px-4 pt-3 transition-colors hover:bg-bg/70 ${connector ? 'pb-1' : 'border-b border-line pb-2'}`}
      onClick={(e) => {
        // Metin seçerken yanlışlıkla sayfa değişmesin.
        if (window.getSelection()?.toString()) return;
        if ((e.target as HTMLElement).closest('a,button,select,textarea,input,[role=link],[role=menu]')) return;
        open();
      }}>
      <div className="flex shrink-0 flex-col items-center">
        <Link to="/u/$handle" params={{ handle: post.author.handle }} onClick={stop} className="rounded-full" tabIndex={-1} aria-hidden>
          <Avatar name={post.author.name} handle={post.author.handle} size={40} />
        </Link>
        {/* Konu zinciri: üstteki gönderiyi alttakine bağlayan çizgi. */}
        {connector && <span aria-hidden className="mt-1 w-0.5 flex-1 rounded-full bg-line" />}
      </div>
      <div className="min-w-0 flex-1">
        {post.repostedBy && (
          <p className="-mt-0.5 mb-0.5 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-muted">
            <Icon icon={RepeatIcon} size={14} />
            <Link to="/u/$handle" params={{ handle: post.repostedBy.handle }} onClick={stop} className="truncate hover:underline">
              {t.feed.repostedBy(post.repostedBy.name)}
            </Link>
          </p>
        )}
        {header}
        <Meta post={post} />
        {post.replyTo && (
          <p className="text-sm text-muted">
            {t.feed.replyingLabel}{' '}
            <Link to="/u/$handle" params={{ handle: post.replyTo }} onClick={stop} className="text-primary-text hover:underline">
              @{post.replyTo}
            </Link>
          </p>
        )}
        <div className="mt-0.5">
          <PostBody body={post.body} />
        </div>
        <Attachments post={post} />
        {post.hidden && <HiddenNotice />}
        <Actions post={post} />
      </div>
    </article>
  );
}

/** Gönderi sayfasındaki odak gönderi: büyük metin, tam tarih. */
export function PostLarge({ post }: { post: Post }) {
  return (
    <article className="border-b border-line px-4 pt-3 pb-1">
      <div className="flex items-center gap-3">
        <Link to="/u/$handle" params={{ handle: post.author.handle }} className="rounded-full" tabIndex={-1} aria-hidden>
          <Avatar name={post.author.name} handle={post.author.handle} size={48} />
        </Link>
        <Meta post={post} large />
      </div>
      {post.replyTo && (
        <p className="mt-2 text-sm text-muted">
          {t.feed.replyingLabel}{' '}
          <Link to="/u/$handle" params={{ handle: post.replyTo }} className="text-primary-text hover:underline">
            @{post.replyTo}
          </Link>
        </p>
      )}
      <div className="mt-3">
        <PostBody body={post.body} large />
      </div>
      <Attachments post={post} />
      {post.hidden && <HiddenNotice />}
      <p className="mt-3 border-b border-line pb-3 text-sm text-muted">
        <time dateTime={post.createdAt}>{formatFull(post.createdAt)}</time>
        {post.claps > 0 && (
          <>
            {' · '}
            <span className="font-medium text-fg">{t.feed.claps(post.claps)}</span>
          </>
        )}
      </p>
      <div className="py-1">
        <Actions post={post} />
      </div>
    </article>
  );
}
