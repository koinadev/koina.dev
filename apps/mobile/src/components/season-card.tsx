import { StyleSheet, View } from 'react-native';
import { content } from '@/lib/content';
import { colors, font, radius } from '@/lib/theme';
import { Card } from './card';
import { Text } from './text';

const WEEK = 7 * 86_400_000;
const { season, hero } = content;
// Hafta 0 kickoff gününün başında (Türkiye saatiyle 00:00) başlar; sitedeki Season.astro ile aynı.
const start = Date.parse(`${hero.status.kickoffAt.slice(0, 10)}T00:00:00+03:00`);
const end = start + 7 * WEEK;

/** Sezon durumu: başlamadan geri sayım, sürerken o haftanın aşaması; altında aşama şeridi. */
export function SeasonCard({ now }: { now: Date }) {
  const t = now.getTime();
  const days = Math.max(0, Math.ceil((Date.parse(hero.status.kickoffAt) - t) / 86_400_000));
  const current = season.steps.find((s) => t >= start + s.start * WEEK && t < start + (s.start + s.span) * WEEK);

  return (
    <Card style={{ gap: 12 }}>
      <Text variant="hand" style={{ color: colors.primaryText }}>{season.eyebrow}</Text>
      {t < start ? (
        <View>
          <Text style={styles.muted}>{season.before}</Text>
          <Text style={styles.status}>
            {days} {season.days}
          </Text>
        </View>
      ) : t < end ? (
        <Text style={styles.status}>
          {season.during}: {current?.name}
        </Text>
      ) : (
        <Text style={[styles.muted, { fontSize: 15 }]}>{season.after}</Text>
      )}
      <View style={styles.bar}>
        {season.steps.map((s, i) => {
          const from = start + s.start * WEEK;
          const to = from + s.span * WEEK;
          const state = t >= to ? 'past' : t >= from ? 'current' : 'future';
          return (
            <View key={s.name} style={{ flex: s.span, gap: 4 }}>
              <View
                style={[
                  styles.segment,
                  { backgroundColor: i === season.steps.length - 1 ? colors.primary : colors.tint },
                  state === 'current' && { backgroundColor: colors.fg },
                  state === 'past' && { opacity: 0.4 },
                ]}
              />
              <Text numberOfLines={2} style={styles.segLabel}>{s.name}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.meta}>
        {hero.status.kickoffLabel}: {hero.status.kickoffDate}. {season.applyBy}: {hero.status.closeDate}.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  status: { fontFamily: font.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: colors.fg },
  muted: { fontFamily: font.regular, fontSize: 16, lineHeight: 22, color: colors.muted, letterSpacing: 0 },
  bar: { flexDirection: 'row', gap: 4 },
  segment: { height: 10, borderRadius: radius.pill },
  segLabel: { fontFamily: font.medium, fontSize: 10, lineHeight: 13, color: colors.muted },
  meta: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
});
