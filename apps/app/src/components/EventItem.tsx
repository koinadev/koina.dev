import { Tick02Icon, Video01Icon } from '@hugeicons/core-free-icons';
import type { KoinaEvent } from '@koina/shared/api';
import { trDayKey } from '@/lib/format';
import { formatLongDay, formatTime, t } from '@/lib/i18n';
import { useRsvp } from '@/lib/queries';
import { useRequireAuth } from '@/lib/session';
import { Icon } from './Icon';
import { btn } from './ui';

export const isLive = (e: KoinaEvent, now = new Date()) => new Date(e.startsAt) <= now && now < new Date(e.endsAt);

/** "Bugün 21:00", "Yarın 21:00" ya da "Salı 3 Kasım · 21:00". Günler Türkiye saatine göre. */
export function whenLabel(iso: string, now = new Date()): string {
  const day = trDayKey(iso);
  const today = trDayKey(now.toISOString());
  const tomorrow = trDayKey(new Date(now.getTime() + 86_400_000).toISOString());
  const time = formatTime(iso);
  if (day === today) return `${t.live.today} ${time}`;
  if (day === tomorrow) return `${t.live.tomorrow} ${time}`;
  return `${formatLongDay(iso)} · ${time}`;
}

/** Katılım düğmesi: iyimser; misafiri girişe gönderir. */
export function RsvpButton({ event, tone = 'light' }: { event: KoinaEvent; tone?: 'light' | 'dark' }) {
  const rsvp = useRsvp();
  const requireAuth = useRequireAuth();
  const going = !!event.me;
  return (
    <button
      type="button"
      aria-pressed={going}
      onClick={() => requireAuth(() => rsvp.mutate({ id: event.id, going: !going }))}
      className={
        going
          ? btn(tone === 'dark' ? 'onInk' : 'outline', 'sm')
          : btn('primary', 'sm')
      }>
      {going && <Icon icon={Tick02Icon} size={16} />}
      {going ? t.live.joined : t.live.join}
    </button>
  );
}

/** Takvim satırı: saat sütunu, başlık, tür ve katılım. */
export function EventItem({ event }: { event: KoinaEvent }) {
  const live = isLive(event);
  const minutes = Math.round((new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime()) / 60_000);
  return (
    <article className="flex gap-4 border-b border-line px-4 py-4">
      <div className="w-14 shrink-0 pt-0.5 text-right">
        <time dateTime={event.startsAt} className="block text-base font-bold tabular-nums">
          {formatTime(event.startsAt)}
        </time>
        <span className="text-xs text-muted">{t.calendar.minutes(minutes)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {live && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-live px-2 py-0.5 text-xs font-bold text-white">
              <span className="size-1.5 animate-pulse rounded-full bg-white" />
              {t.live.now}
            </span>
          )}
          <span className="text-sm font-medium text-muted">{t.kinds[event.kind]}</span>
        </div>
        <h3 className="mt-0.5 text-[1.0625rem] font-bold">{event.title}</h3>
        {event.description && <p className="mt-1 text-[0.9375rem] text-fg/85">{event.description}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <RsvpButton event={event} />
          {event.url && (
            <a href={event.url} target="_blank" rel="noopener noreferrer" className={btn('ghost', 'sm')}>
              <Icon icon={Video01Icon} size={16} />
              {live ? t.live.watch : t.calendar.open}
            </a>
          )}
          <span className="text-sm text-muted">{t.live.going(event.going)}</span>
        </div>
      </div>
    </article>
  );
}
