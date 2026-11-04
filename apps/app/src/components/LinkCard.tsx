import { ArrowUpRight01Icon, Delete02Icon, Flag02Icon, MoreHorizontalIcon, ThumbsUpIcon } from '@hugeicons/core-free-icons';
import type { Link as UsefulLink } from '@koina/shared/api';
import { Link, useRouter } from '@tanstack/react-router';
import { errorText, formatNumber, t } from '@/lib/i18n';
import { UGC_REL } from '@/lib/links';
import { useDeleteLink, useVoteLink } from '@/lib/queries';
import { isModerator, useMe, useRequireAuth } from '@/lib/session';
import { Icon } from './Icon';
import { Menu } from './Menu';
import { useOverlays } from './overlays';
import { Ago } from './PostItem';
import { IconButton } from './ui';

/** "İşe yarar" düğmesi: iyimser; misafiri girişe gönderir. */
export function VoteButton({ link }: { link: UsefulLink }) {
  const vote = useVoteLink();
  const requireAuth = useRequireAuth();
  const { toast } = useOverlays();
  const on = !!link.voted;
  return (
    <button
      type="button"
      aria-pressed={on}
      title={on ? t.links.usefulOn : t.links.useful}
      onClick={() => requireAuth(() => vote.mutate({ id: link.id, on: !on }, { onError: (err) => toast(errorText(err)) }))}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border-[1.5px] px-3 text-sm font-semibold tabular-nums transition-colors ${
        on ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface text-fg hover:border-fg/40'
      }`}>
      <Icon icon={ThumbsUpIcon} size={16} />
      <span>{t.links.useful}</span>
      <span className={on ? '' : 'text-muted'}>{formatNumber(link.votes)}</span>
    </button>
  );
}

export function LinkMenu({ link }: { link: UsefulLink }) {
  const me = useMe();
  const { report, confirm, toast } = useOverlays();
  const remove = useDeleteLink();
  const router = useRouter();
  if (!me) return null;
  const items = [
    ...(me.handle !== link.author.handle ? [{ label: t.feed.report, icon: Flag02Icon, onSelect: () => report({ target: 'link', id: link.id }) }] : []),
    ...(me.handle === link.author.handle || isModerator(me)
      ? [
          {
            label: t.links.delete,
            icon: Delete02Icon,
            danger: true,
            onSelect: async () => {
              if (!(await confirm(t.links.deleteConfirm, { action: t.links.delete, danger: true }))) return;
              remove.mutate(link.id, {
                onSuccess: () => {
                  toast(t.links.deleted);
                  if (window.location.pathname === `/baglantilar/${link.id}`) router.navigate({ to: '/baglantilar', replace: true });
                },
                onError: (err) => toast(errorText(err)),
              });
            },
          },
        ]
      : []),
  ];
  if (!items.length) return null;
  return <Menu items={items} trigger={(p) => <IconButton {...p} icon={MoreHorizontalIcon} label={t.feed.more} className="text-muted" />} />;
}

/** Bağlantılar listesindeki satır: görsel (varsa), kaynak, başlık, açıklama, etiketler ve oy. */
export function LinkCard({ link }: { link: UsefulLink }) {
  return (
    <article className="flex gap-3 border-b border-line px-4 py-4">
      <a
        href={link.url}
        target="_blank"
        rel={UGC_REL}
        tabIndex={-1}
        aria-hidden
        className="hidden size-20 shrink-0 overflow-hidden rounded-2xl border border-line bg-tint min-[400px]:block">
        {link.image ? (
          <img src={link.image} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-2xl font-bold text-primary-text">{link.host.charAt(0).toUpperCase()}</span>
        )}
      </a>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 items-center gap-1.5 text-[0.8125rem] text-muted">
              <span className="truncate font-medium">{link.siteName || link.host}</span>
              {link.siteName && link.siteName !== link.host && <span className="truncate">· {link.host}</span>}
              <span className="shrink-0 rounded-full bg-tint px-2 py-px text-xs font-semibold text-on-tint">{t.links.categories[link.category]}</span>
            </p>
            <h3 className="mt-0.5 text-base leading-snug font-bold break-anywhere">
              <Link to="/baglantilar/$id" params={{ id: link.id }} className="hover:underline">
                {link.title}
              </Link>
            </h3>
          </div>
          <LinkMenu link={link} />
        </div>
        {link.description && <p className="mt-1 line-clamp-3 text-[0.9375rem] leading-normal text-fg/85 break-anywhere">{link.description}</p>}
        {link.hidden && <p className="mt-2 rounded-xl bg-danger-bg px-3 py-1.5 text-sm">{t.feed.hidden}</p>}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <VoteButton link={link} />
          <a href={link.url} target="_blank" rel={UGC_REL} className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold text-primary-text hover:bg-tint">
            {t.links.open}
            <Icon icon={ArrowUpRight01Icon} size={15} />
          </a>
          {link.tags.map((tag) => (
            <Link
              key={tag}
              to="/baglantilar"
              search={{ etiket: tag }}
              className="rounded-full border border-line px-2 py-0.5 text-xs font-medium text-muted hover:border-fg/40 hover:text-fg">
              #{tag}
            </Link>
          ))}
        </div>
        <p className="mt-2 text-[0.8125rem] text-muted">
          <Link to="/u/$handle" params={{ handle: link.author.handle }} className="hover:underline">
            {t.links.sharedBy(link.author.name)}
          </Link>{' '}
          · <Ago iso={link.createdAt} />
        </p>
      </div>
    </article>
  );
}
