import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { dayKey, type Entry, type EntryTone } from '@/lib/agenda';
import { locale, t } from '@/lib/i18n';
import { openUrl } from '@/lib/open';
import { useRsvp } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { colors, font, radius } from '@/lib/theme';
import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';

const lang = locale === 'tr' ? 'tr-TR' : 'en-US';
const tz = 'Europe/Istanbul';
const fmt = {
  weekday: new Intl.DateTimeFormat(lang, { weekday: 'short', timeZone: tz }),
  weekdayLong: new Intl.DateTimeFormat(lang, { weekday: 'long', timeZone: tz }),
  dayNum: new Intl.DateTimeFormat(lang, { day: 'numeric', timeZone: tz }),
  heading: new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz }),
  time: new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }),
};
export const formatTime = (at: Date) => fmt.time.format(at);
export const formatWeekday = (at: Date) => fmt.weekdayLong.format(at);

// Etkinlik türüne göre açık zemin + ikon; sitedeki haftalık takvimle aynı renk dili.
const tones: Record<EntryTone, { bg: string; icon: IconName }> = {
  stream: { bg: '#FFE6EE', icon: 'LiveStreaming01Icon' },
  live: { bg: '#FFE6EE', icon: 'LiveStreaming01Icon' },
  workshop: { bg: '#FFE6EE', icon: 'LiveStreaming01Icon' },
  demo: { bg: '#E2F7EC', icon: 'Presentation01Icon' },
  meetup: { bg: '#FFF5D1', icon: 'UserGroupIcon' },
  discord: { bg: colors.tint, icon: 'DiscordIcon' },
};

/** Sayaç metni: `1g 4sa 12dk`; bir günden azsa gün, bir saatten azsa saat düşer. */
export function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 60_000));
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  const u = locale === 'tr' ? { d: 'g', h: 'sa', m: 'dk' } : { d: 'd', h: 'h', m: 'm' };
  return [d && `${d}${u.d}`, (d || h) && `${h}${u.h}`, `${m}${u.m}`].filter(Boolean).join(' ');
}

/** Yatay gün şeridi: seçili gün sarı, etkinliği olan günün altında nokta. */
export function DayStrip({
  days,
  selected,
  busy,
  onSelect,
}: {
  days: Date[];
  selected: string;
  busy: Set<string>;
  onSelect: (key: string) => void;
}) {
  const scroller = useRef<ScrollViewInstance>(null);
  const index = days.findIndex((d) => dayKey(d) === selected);
  useEffect(() => {
    scroller.current?.scrollTo({ x: Math.max(0, index - 2) * 58, animated: true });
  }, [index]);

  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
      style={styles.stripOuter}>
      {days.map((day, i) => {
        const key = dayKey(day);
        const active = key === selected;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={fmt.heading.format(day)}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(key);
            }}
            style={[styles.day, active && styles.dayActive]}>
            <Text style={[styles.dayName, active && { color: colors.fg }]}>
              {i === 0 ? t.events.today : fmt.weekday.format(day)}
            </Text>
            <Text style={styles.dayNum}>{fmt.dayNum.format(day)}</Text>
            <View style={[styles.dot, busy.has(key) && { backgroundColor: active ? colors.fg : colors.accent }]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function dayHeading(day: Date, index: number): string {
  const label = fmt.heading.format(day);
  if (index === 0) return `${t.events.today}, ${label}`;
  if (index === 1) return `${t.events.tomorrow}, ${label}`;
  return label;
}

/** Zaman çizelgesi satırı: solda saat ve süre, sağda türünün renginde kart. */
export function AgendaRow({ entry, offline, now }: { entry: Entry; offline?: boolean; now: Date }) {
  const { user } = useSession();
  const rsvp = useRsvp();
  const tone = tones[entry.tone];
  const live = entry.start <= now && entry.end > now;
  const minutes = Math.round((entry.end.getTime() - entry.start.getTime()) / 60_000);
  const event = entry.event;

  return (
    <View style={styles.row}>
      <View style={styles.time}>
        <Text style={styles.timeText}>{formatTime(entry.start)}</Text>
        <Text style={styles.duration}>{t.events.minutes(minutes)}</Text>
      </View>
      <View style={[styles.entry, { backgroundColor: tone.bg }, live && styles.entryLive]}>
        <View style={styles.entryTop}>
          <Icon name={tone.icon} size={16} color={colors.muted} />
          <Text style={styles.kind}>
            {live ? t.events.liveNow : event ? t.events[event.kind] : t.events.routine}
          </Text>
          {event && !offline && <Text style={[styles.kind, { marginLeft: 'auto' }]}>{t.events.going(event.going)}</Text>}
        </View>
        <Text style={styles.title}>{entry.title}</Text>
        {entry.text ? <Text style={styles.text}>{entry.text}</Text> : null}
        {entry.where && <Text style={styles.where}>{entry.where}</Text>}
        {event && !offline && (
          <View style={styles.actions}>
            <Button
              small
              variant={event.me ? 'ghost' : 'primary'}
              icon={event.me ? 'CheckmarkCircle02Icon' : 'Calendar01Icon'}
              label={event.me ? t.events.joined : t.events.join}
              onPress={() => (user ? rsvp.mutate({ id: event.id, going: !event.me }) : router.push('/login'))}
            />
            {event.url && <Button small variant="outline" label={t.events.open} onPress={() => openUrl(event.url!)} />}
          </View>
        )}
      </View>
    </View>
  );
}

/** Sıradaki etkinlik: koyu kart, dakikada iki kez güncellenen geri sayım. */
export function NextUp({ entry, now }: { entry: Entry; now: Date }) {
  const live = entry.start <= now;
  return (
    <View style={styles.next}>
      <View style={styles.nextTop}>
        <View style={[styles.nextDot, live && { backgroundColor: colors.live }]} />
        <Text style={styles.nextKicker}>{live ? t.events.liveNow : t.events.next}</Text>
      </View>
      <Text style={styles.nextTitle}>{entry.title}</Text>
      <Text style={styles.nextMeta}>
        {formatWeekday(entry.start)} {formatTime(entry.start)}
        {entry.where ? `\n${entry.where}` : ''}
      </Text>
      {!live && <Text style={styles.nextCount}>{countdown(entry.start.getTime() - now.getTime())}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  stripOuter: { marginHorizontal: -16 },
  strip: { paddingHorizontal: 16, gap: 8 },
  day: {
    width: 50,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  dayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayName: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: colors.muted },
  dayNum: { fontFamily: font.bold, fontSize: 19, lineHeight: 24, color: colors.fg },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2, backgroundColor: 'transparent' },
  row: { flexDirection: 'row', gap: 12 },
  time: { width: 52, paddingTop: 14, alignItems: 'flex-end' },
  timeText: { fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: colors.fg, fontVariant: ['tabular-nums'] },
  duration: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: colors.muted },
  entry: { flex: 1, borderRadius: radius.md, padding: 14, gap: 4 },
  entryLive: { borderWidth: 2, borderColor: colors.live },
  entryTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kind: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: colors.muted },
  title: { fontFamily: font.bold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3, color: colors.fg, marginTop: 2 },
  text: { fontFamily: font.regular, fontSize: 14, lineHeight: 19, color: colors.muted },
  where: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  next: { backgroundColor: colors.fg, borderRadius: radius.lg, padding: 20, gap: 4 },
  nextTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.squiggle },
  nextKicker: { fontFamily: font.medium, fontSize: 14, lineHeight: 18, color: '#C9CCE6' },
  nextTitle: { fontFamily: font.bold, fontSize: 26, lineHeight: 31, letterSpacing: -0.6, color: colors.bg, marginTop: 4 },
  nextMeta: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: '#C9CCE6' },
  nextCount: {
    fontFamily: font.bold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1,
    color: colors.primary,
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
});
