import { upcomingStreams } from '@koina/shared/schedule';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { locale, t } from '@/lib/i18n';
import { openUrl } from '@/lib/open';
import { colors, font, radius } from '@/lib/theme';
import { Button } from './button';
import { Text } from './text';

function left(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60_000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const parts = locale === 'tr' ? [`${d} gün`, `${h} saat`, `${m % 60} dk`] : [`${d}d`, `${h}h`, `${m % 60}m`];
  return (d > 0 ? parts.slice(0, 2) : h > 0 ? parts.slice(1) : parts.slice(2)).join(' ');
}

/** Sonraki canlı yayın: dakikada bir güncellenen geri sayım, yayın sürerken "şu an canlı". */
export function LiveCard() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const [next] = upcomingStreams(now, 1);
  const live = next.start <= now;
  const day = new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long', timeZone: 'Europe/Istanbul' }).format(next.start);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.dot, live && { backgroundColor: colors.live }]} />
        <Text style={styles.kicker}>{live ? t.home.live : t.home.next}</Text>
      </View>
      <Text style={styles.title}>{next.slot.title[locale]}</Text>
      <Text style={styles.meta}>
        {day} 21:00{live ? '' : ` · ${left(next.start.getTime() - now.getTime())}`}
      </Text>
      <Button small label={t.home.watch} icon="LiveStreaming01Icon" onPress={() => openUrl('https://www.youtube.com/@koinadev/live')} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.fg, borderRadius: radius.lg, padding: 20, gap: 6, alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.squiggle },
  kicker: { fontFamily: font.medium, fontSize: 14, color: '#C9CCE6' },
  title: { fontFamily: font.bold, fontSize: 24, letterSpacing: -0.5, color: colors.bg },
  meta: { fontFamily: font.regular, fontSize: 15, color: '#C9CCE6', marginBottom: 10 },
});
