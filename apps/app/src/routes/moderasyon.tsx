import { Shield01Icon } from '@hugeicons/core-free-icons';
import type { ModAction, ModQueueItem } from '@koina/shared/api';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { LinkCard } from '@/components/LinkCard';
import { useOverlays } from '@/components/overlays';
import { PageHeader, Tabs } from '@/components/PageHeader';
import { Ago, PostItem } from '@/components/PostItem';
import { BlockSkeleton, Button, EmptyState, ErrorState } from '@/components/ui';
import { requireMe } from '@/lib/guards';
import { errorText, formatFull, t } from '@/lib/i18n';
import { modLogQuery, modQueueQuery, useModAction } from '@/lib/queries';
import { seo } from '@/lib/seo';
import { isModerator } from '@/lib/session';

export const Route = createFileRoute('/moderasyon')({
  beforeLoad: (ctx) => requireMe(ctx),
  loader: async ({ context }) => {
    // Yetkisiz üyeye kuyruk istenmez (API zaten 403 döner); sayfa yalnız uyarı gösterir.
    if (!isModerator(context.me)) return;
    await context.queryClient.ensureQueryData(modQueueQuery);
  },
  head: ({ match }) => seo({ appUrl: match.context.config.appUrl, title: t.moderation.title, description: t.moderation.title, path: '/moderasyon', noindex: true }),
  component: Moderation,
});

/** Hedef türüne göre anlamlı işlemler; "kaldır" geri alınamaz, "uzaklaştır" üyenin oturumlarını siler. */
function actionsFor(item: ModQueueItem): ModAction[] {
  if (item.targetKind === 'user') return ['ban', 'unban', 'dismiss'];
  const hidden = item.post?.hidden || item.link?.hidden;
  return [hidden ? 'restore' : 'hide', 'remove', 'dismiss'];
}

function QueueItem({ item }: { item: ModQueueItem }) {
  const act = useModAction();
  const { confirm, toast } = useOverlays();
  const [reason, setReason] = useState('');
  const run = async (action: ModAction) => {
    const label = t.moderation.actions[action];
    if ((action === 'remove' || action === 'ban') && !(await confirm(t.moderation.confirm(label), { action: label, danger: true }))) return;
    act.mutate(
      { targetKind: item.targetKind, targetId: item.targetId, action, reason: reason.trim() },
      { onSuccess: () => toast(t.moderation.done), onError: (err) => toast(errorText(err)) },
    );
  };
  const authorHandle = item.post?.author.handle ?? item.link?.author.handle;
  return (
    <li className="border-b-4 border-line/70">
      <div className="flex flex-wrap items-center gap-2 bg-bg px-4 py-2.5 text-sm">
        <span className="rounded-full bg-fg px-2.5 py-0.5 text-xs font-bold text-bg">{t.moderation.kinds[item.targetKind]}</span>
        <span className="font-semibold text-live">{t.moderation.reports(item.reports)}</span>
        <span className="text-muted">{item.reasons.map((r) => t.report.reasons[r]).join(', ')}</span>
        <span className="ml-auto text-muted" title={formatFull(item.lastAt)}>
          <Ago iso={item.lastAt} />
        </span>
      </div>
      {item.post ? (
        <PostItem post={item.post} />
      ) : item.link ? (
        <LinkCard link={item.link} />
      ) : item.member ? (
        <Link to="/u/$handle" params={{ handle: item.member.handle }} className="flex items-center gap-3 border-b border-line px-4 py-3 hover:bg-bg/70">
          <Avatar name={item.member.name} handle={item.member.handle} size={40} />
          <span>
            <span className="block font-bold">{item.member.name}</span>
            <span className="block text-sm text-muted">@{item.member.handle}</span>
          </span>
        </Link>
      ) : (
        <p className="px-4 py-3 text-sm text-muted">{t.moderation.gone}</p>
      )}
      <div className="space-y-2 px-4 py-3">
        <label className="sr-only" htmlFor={`reason-${item.targetId}`}>
          {t.moderation.reason}
        </label>
        <input
          id={`reason-${item.targetId}`}
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t.moderation.reason}
          className="h-10 w-full rounded-full border-[1.5px] border-line bg-surface px-4 text-sm focus:border-primary-text focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          {actionsFor(item).map((a) => (
            <Button key={a} size="sm" variant={a === 'remove' || a === 'ban' ? 'danger' : a === 'dismiss' ? 'ghost' : 'outline'} disabled={act.isPending} onClick={() => run(a)}>
              {t.moderation.actions[a]}
            </Button>
          ))}
          {/* İçeriğin sahibini de uzaklaştırabilmek için: üyeyi hedef alan ayrı işlem. */}
          {item.targetKind !== 'user' && authorHandle && (
            <Link to="/u/$handle" params={{ handle: authorHandle }} className="inline-flex h-9 items-center px-2 text-sm font-medium text-primary-text hover:underline">
              @{authorHandle}
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

function Queue() {
  const queue = useQuery(modQueueQuery);
  if (queue.isPending) return <BlockSkeleton count={3} className="h-40" />;
  if (queue.isError) return <ErrorState error={queue.error} onRetry={() => queue.refetch()} />;
  if (!queue.data.items.length) return <EmptyState icon={Shield01Icon} text={t.moderation.empty} />;
  return (
    <ul>
      {queue.data.items.map((item) => (
        <QueueItem key={`${item.targetKind}-${item.targetId}`} item={item} />
      ))}
    </ul>
  );
}

function Log() {
  const log = useQuery(modLogQuery);
  if (log.isPending) return <BlockSkeleton count={4} className="h-12" />;
  if (log.isError) return <ErrorState error={log.error} onRetry={() => log.refetch()} />;
  if (!log.data.items.length) return <EmptyState icon={Shield01Icon} text={t.moderation.logEmpty} />;
  return (
    <ul>
      {log.data.items.map((e) => {
        const action = (t.moderation.actions as Record<string, string>)[e.action] ?? e.action;
        return (
          <li key={e.id} className="border-b border-line px-4 py-3 text-[0.9375rem]">
            <p>
              <strong className="font-bold">{e.actorHandle ? `@${e.actorHandle}` : t.moderation.auto}</strong> · {action} ·{' '}
              <span className="text-muted">{t.moderation.kinds[e.targetKind]}</span>
              {e.targetKind === 'post' && (
                <>
                  {' '}
                  <Link to="/akis/$id" params={{ id: e.targetId }} className="text-primary-text hover:underline">
                    {e.targetId.slice(0, 8)}
                  </Link>
                </>
              )}
              {e.targetKind === 'link' && (
                <>
                  {' '}
                  <Link to="/baglantilar/$id" params={{ id: e.targetId }} className="text-primary-text hover:underline">
                    {e.targetId.slice(0, 8)}
                  </Link>
                </>
              )}
            </p>
            {e.reason && <p className="mt-0.5 text-sm text-muted break-anywhere">{e.reason}</p>}
            <p className="mt-0.5 text-[0.8125rem] text-muted">{formatFull(e.createdAt)}</p>
          </li>
        );
      })}
    </ul>
  );
}

function Moderation() {
  const { me } = Route.useRouteContext();
  const [tab, setTab] = useState<'queue' | 'log'>('queue');
  if (!isModerator(me))
    return (
      <>
        <PageHeader title={t.moderation.title} />
        <EmptyState icon={Shield01Icon} text={t.moderation.forbidden} />
      </>
    );
  return (
    <>
      <PageHeader title={t.moderation.title}>
        <Tabs
          label={t.moderation.title}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'queue', label: t.moderation.queue },
            { value: 'log', label: t.moderation.log },
          ]}
        />
      </PageHeader>
      {tab === 'queue' ? <Queue /> : <Log />}
    </>
  );
}
