import {
  BubbleChatIcon,
  Clapping02Icon,
  Notification03Icon,
  QuoteDownIcon,
  RepeatIcon,
  UserAdd01Icon,
  AtIcon,
} from '@hugeicons/core-free-icons';
import type { Notification, NotificationKind } from '@koina/shared/api';
import { useInfiniteQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { Avatar } from '@/components/Avatar';
import { Icon, type IconSvgElement } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Ago } from '@/components/PostItem';
import { EmptyState, ErrorState, MoreButton, PostSkeleton } from '@/components/ui';
import { uniqueById } from '@/lib/format';
import { requireMe } from '@/lib/guards';
import { t } from '@/lib/i18n';
import { notificationsQuery, useMarkRead } from '@/lib/queries';
import { seo } from '@/lib/seo';
import { useMe } from '@/lib/session';

export const Route = createFileRoute('/bildirimler')({
  beforeLoad: requireMe,
  loader: ({ context }) => context.queryClient.ensureInfiniteQueryData(notificationsQuery).then(() => undefined),
  head: ({ match }) => seo({ appUrl: match.context.config.appUrl, title: t.notifications.title, description: t.notifications.title, path: '/bildirimler', noindex: true }),
  component: Notifications,
});

const icons: Record<NotificationKind, { icon: IconSvgElement; tone: string }> = {
  reply: { icon: BubbleChatIcon, tone: 'bg-tint text-primary-text' },
  mention: { icon: AtIcon, tone: 'bg-tint text-primary-text' },
  quote: { icon: QuoteDownIcon, tone: 'bg-squiggle/40 text-fg' },
  repost: { icon: RepeatIcon, tone: 'bg-squiggle/40 text-fg' },
  clap: { icon: Clapping02Icon, tone: 'bg-primary/50 text-fg' },
  follow: { icon: UserAdd01Icon, tone: 'bg-accent/25 text-fg' },
};

function Row({ n }: { n: Notification }) {
  const { icon, tone } = icons[n.kind];
  const body = (
    <>
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${tone}`}>
        <Icon icon={icon} size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <Avatar name={n.actor.name} handle={n.actor.handle} size={28} />
          {!n.read && <span className="size-2 rounded-full bg-live" aria-label="yeni" />}
        </span>
        <span className="mt-1 block text-[0.9375rem]">
          <strong className="font-bold">{n.actor.name}</strong> {t.notifications.kinds[n.kind]}
          <span className="text-muted">
            {' · '}
            <Ago iso={n.createdAt} />
          </span>
        </span>
        {n.post?.body && <span className="mt-0.5 line-clamp-2 block text-[0.9375rem] text-muted break-anywhere">{n.post.body}</span>}
      </span>
    </>
  );
  const cls = `flex gap-3 border-b border-line px-4 py-3 transition-colors hover:bg-bg/70 ${n.read ? '' : 'bg-tint/30'}`;
  return n.post ? (
    <Link to="/akis/$id" params={{ id: n.post.id }} className={cls}>
      {body}
    </Link>
  ) : (
    <Link to="/u/$handle" params={{ handle: n.actor.handle }} className={cls}>
      {body}
    </Link>
  );
}

function Notifications() {
  const list = useInfiniteQuery(notificationsQuery);
  const markRead = useMarkRead();
  const me = useMe();
  const marked = useRef(false);
  // Sayfa açılınca hepsi okundu sayılır; vurgular bu ziyarette kalır (liste yeniden çekilmez).
  useEffect(() => {
    if (!marked.current && me && me.unread > 0) {
      marked.current = true;
      markRead.mutate();
    }
  }, [me, markRead]);

  return (
    <>
      <PageHeader title={t.notifications.title} />
      {list.isPending ? (
        <PostSkeleton count={4} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.data.pages[0]?.items.length === 0 ? (
        <EmptyState icon={Notification03Icon} text={t.notifications.empty} />
      ) : (
        <div>
          {uniqueById(list.data.pages.flatMap((p) => p.items)).map((n) => (
            <Row key={n.id} n={n} />
          ))}
          <MoreButton query={list} />
        </div>
      )}
    </>
  );
}
