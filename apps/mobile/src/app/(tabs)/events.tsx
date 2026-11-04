import { calendarFeeds } from '@koina/web/calendar';
import { useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { AgendaRow, DayStrip, NextUp, dayHeading, formatWeekday } from '@/components/calendar';
import { ErrorNote, Loading } from '@/components/misc';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { DAY_MS, buildAgenda, dayKey, nextDays } from '@/lib/agenda';
import { SITE_URL } from '@/lib/config';
import { locale, t } from '@/lib/i18n';
import { offlineEvents, useEvents } from '@/lib/queries';
import { colors } from '@/lib/theme';

const DAYS = 14;

export default function Events() {
  const events = useEvents();
  // API'ye ulaşılamazsa haftalık yayınlar yine de görünür; katılım düğmeleri gizlenir.
  const offline = events.isError;
  const apiItems = offline ? offlineEvents() : events.data?.items;

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const days = useMemo(() => nextDays(now, DAYS), [now]);
  const agenda = useMemo(
    () => buildAgenda(apiItems ?? [], now, new Date(days[0].getTime() + DAYS * DAY_MS)),
    [apiItems, now, days],
  );
  const byDay = useMemo(() => {
    const map = new Map<string, typeof agenda>();
    for (const entry of agenda) map.set(dayKey(entry.start), [...(map.get(dayKey(entry.start)) ?? []), entry]);
    return map;
  }, [agenda]);

  const [selected, setSelected] = useState(() => dayKey(now));
  const index = Math.max(0, days.findIndex((d) => dayKey(d) === selected));
  const entries = byDay.get(selected) ?? [];
  const nextBusy = days.slice(index + 1).find((d) => byDay.has(dayKey(d)));

  const subscribe = () => Linking.openURL(`${SITE_URL.replace(/^https?:/, 'webcal:')}${calendarFeeds[locale]}`);

  return (
    <Screen title={t.events.title} lead={t.events.lead} refreshing={events.isRefetching} onRefresh={() => events.refetch()}>
      {offline && <ErrorNote text={t.events.offline} retryLabel={t.common.retry} onRetry={() => events.refetch()} />}
      {events.isPending && !offline ? (
        <Loading />
      ) : (
        <>
          {agenda[0] && <NextUp entry={agenda[0]} now={now} />}
          <Button small variant="outline" icon="CalendarAdd01Icon" label={t.events.subscribe} onPress={subscribe} />

          <DayStrip days={days} selected={selected} busy={new Set(byDay.keys())} onSelect={setSelected} />

          <Text variant="heading" style={{ marginTop: 4 }}>{dayHeading(days[index], index)}</Text>
          {entries.length > 0 ? (
            <View style={{ gap: 10 }}>
              {entries.map((entry) => (
                <AgendaRow key={entry.key} entry={entry} offline={offline} now={now} />
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <Text variant="small">{t.events.empty}</Text>
              {nextBusy && (
                <Button
                  small
                  variant="ghost"
                  icon="ArrowRight01Icon"
                  label={t.events.jump(formatWeekday(nextBusy))}
                  onPress={() => setSelected(dayKey(nextBusy))}
                />
              )}
            </View>
          )}
          <Text variant="small" style={{ fontSize: 12, textAlign: 'center' }}>{t.events.timezone}</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
});
