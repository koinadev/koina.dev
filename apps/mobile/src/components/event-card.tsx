import type { KoinaEvent } from '@koina/shared/api';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { formatEventDate, t } from '@/lib/i18n';
import { openUrl } from '@/lib/open';
import { useRsvp } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { colors, font, radius } from '@/lib/theme';
import { Button } from './button';
import { Card } from './card';
import { Text } from './text';

const kindColor = { stream: colors.accent, meetup: colors.primary, demo: colors.squiggle, workshop: colors.tint };

export function EventCard({ event, offline }: { event: KoinaEvent; offline?: boolean }) {
  const { user } = useSession();
  const rsvp = useRsvp();
  const live = new Date(event.startsAt) <= new Date() && new Date(event.endsAt) > new Date();

  return (
    <Card style={{ gap: 8 }}>
      <View style={styles.row}>
        <View style={[styles.kind, { backgroundColor: kindColor[event.kind] }]}>
          <Text style={{ fontFamily: font.medium, fontSize: 12, color: colors.fg }}>
            {live ? t.home.live : t.events[event.kind]}
          </Text>
        </View>
        {!offline && <Text variant="small" style={{ fontSize: 13 }}>{t.events.going(event.going)}</Text>}
      </View>
      <Text variant="heading">{event.title}</Text>
      <Text variant="label">{formatEventDate(event.startsAt)}</Text>
      {event.description ? <Text variant="small" style={{ fontSize: 15, lineHeight: 22 }}>{event.description}</Text> : null}
      <View style={[styles.row, { marginTop: 6, justifyContent: 'flex-start', gap: 8 }]}>
        {!offline && (
          <Button
            small
            variant={event.me ? 'ghost' : 'primary'}
            icon={event.me ? 'CheckmarkCircle02Icon' : 'Calendar01Icon'}
            label={event.me ? t.events.joined : t.events.join}
            onPress={() => (user ? rsvp.mutate({ id: event.id, going: !event.me }) : router.push('/login'))}
          />
        )}
        {event.url && <Button small variant="outline" label={t.events.open} onPress={() => openUrl(event.url!)} />}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kind: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
});
