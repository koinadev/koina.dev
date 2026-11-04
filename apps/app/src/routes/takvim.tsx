import { Calendar03Icon, CalendarAdd01Icon } from '@hugeicons/core-free-icons';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { EventItem } from '@/components/EventItem';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { BlockSkeleton, btn, EmptyState } from '@/components/ui';
import { groupByDay, resolveUrl, trDayKey } from '@/lib/format';
import { errorText, formatLongDay, sitePaths, t } from '@/lib/i18n';
import { eventsQuery, offlineEvents } from '@/lib/queries';
import { absolute, breadcrumbs, seo } from '@/lib/seo';
import { useConfig } from '@/lib/use-config';

export const Route = createFileRoute('/takvim')({
  // Takvim API'ye ulaşılamazsa da açılır (haftalık yayınlar yerelde hesaplanır); yükleyici hatayı yutar.
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQuery).catch(() => null),
  head: ({ match, loaderData }) => {
    const appUrl = match.context.config.appUrl;
    const upcoming = (loaderData?.items ?? []).filter((e) => new Date(e.endsAt) > new Date()).slice(0, 10);
    return seo({
      appUrl,
      title: t.calendar.title,
      description: t.calendar.description,
      path: '/takvim',
      jsonLd: [
        {
          '@type': 'ItemList',
          name: t.calendar.title,
          itemListElement: upcoming.map((e, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Event',
              name: e.title,
              description: e.description || t.kinds[e.kind],
              startDate: e.startsAt,
              endDate: e.endsAt,
              eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
              eventStatus: 'https://schema.org/EventScheduled',
              location: { '@type': 'VirtualLocation', url: e.url ?? absolute(appUrl, '/takvim') },
              organizer: { '@type': 'Organization', name: 'koina.dev', url: appUrl },
            },
          })),
        },
        breadcrumbs(appUrl, [{ name: t.calendar.title, path: '/takvim' }]),
      ],
    });
  },
  component: Calendar,
});

function Calendar() {
  const events = useQuery(eventsQuery);
  const { siteUrl } = useConfig();
  const ics = resolveUrl(sitePaths.ics, siteUrl);
  // API'ye ulaşılamazsa haftalık yayınlar yine görünür; katılım o sırada kapalı kalır.
  const list = events.data?.items ?? (events.isError ? offlineEvents() : []);
  const groups = groupByDay(list.filter((e) => new Date(e.endsAt) > new Date()));
  const today = trDayKey(new Date().toISOString());
  const tomorrow = trDayKey(new Date(Date.now() + 86_400_000).toISOString());

  return (
    <>
      <PageHeader title={t.calendar.title} subtitle={t.calendar.timezone} />
      <section className="border-b border-line px-4 py-4">
        <p className="text-[0.9375rem] leading-relaxed">{t.calendar.lead}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a href={ics} className={btn('outline', 'sm')}>
            <Icon icon={CalendarAdd01Icon} size={17} />
            {t.calendar.subscribe}
          </a>
          <span className="text-[0.8125rem] text-muted">{t.calendar.subscribeHint}</span>
        </div>
      </section>

      {events.isError && (
        <p role="status" className="mx-4 mt-4 rounded-2xl bg-danger-bg px-4 py-3 text-sm">
          {errorText(events.error)}
        </p>
      )}

      {events.isPending ? (
        <BlockSkeleton count={4} className="h-24" />
      ) : groups.length === 0 ? (
        <EmptyState icon={Calendar03Icon} text={t.calendar.empty} />
      ) : (
        groups.map((g) => {
          const label = g.day === today ? t.live.today : g.day === tomorrow ? t.live.tomorrow : null;
          return (
            <section key={g.day} aria-labelledby={`day-${g.day}`}>
              {/* Gün başlığı başlığın hemen altına yapışır; uzun listede hangi günde olduğun belli kalsın. */}
              <h2
                id={`day-${g.day}`}
                className="sticky top-14 z-10 border-b border-line bg-bg/95 px-4 py-2 text-sm font-bold backdrop-blur-sm">
                {label && <span className="mr-1.5 text-primary-text">{label}</span>}
                <span className={label ? 'font-medium text-muted' : ''}>{formatLongDay(g.items[0]!.startsAt)}</span>
              </h2>
              {g.items.map((e) => (
                <EventItem key={e.id} event={e} />
              ))}
            </section>
          );
        })
      )}
    </>
  );
}
