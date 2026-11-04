import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon, type IconName } from '@/components/icon';
import { Mark } from '@/components/mark';
import { Loading } from '@/components/misc';
import { EventCard } from '@/components/event-card';
import { ProfileView } from '@/components/profile-view';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { api } from '@/lib/api';
import { errorText, t } from '@/lib/i18n';
import { openTarget } from '@/lib/open';
import { colors, font } from '@/lib/theme';
import { useEvents } from '@/lib/queries';
import { useSession } from '@/lib/session';

export default function Me() {
  const { user, signOut } = useSession();
  const events = useEvents();

  if (user === undefined) return <Loading />;
  if (!user) {
    return (
      <Screen title={t.me.title}>
        <Card style={{ gap: 14, alignItems: 'flex-start' }}>
          <Mark size={44} />
          <Text variant="heading" style={{ fontSize: 22 }}>{t.me.guestTitle}</Text>
          <Text variant="small" style={{ fontSize: 15, lineHeight: 22 }}>{t.me.guestText}</Text>
          <Button label={t.me.signIn} icon="Mail01Icon" onPress={() => router.push('/login')} />
        </Card>
        <Text variant="heading" style={{ marginTop: 12 }}>{t.me.perksTitle}</Text>
        <Card style={{ paddingVertical: 4 }}>
          {t.me.perks.map((perk, i) => (
            <View key={perk.title} style={[styles.perk, i > 0 && styles.perkLine]}>
              <View style={styles.perkIcon}>
                <Icon name={perk.icon as IconName} size={20} color={colors.primaryText} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: font.semibold }}>{perk.title}</Text>
                <Text variant="small" style={{ fontSize: 14, lineHeight: 20 }}>{perk.text}</Text>
              </View>
            </View>
          ))}
        </Card>
        <View style={styles.footer}>
          <Button small variant="ghost" label={t.me.conduct} onPress={() => openTarget({ route: 'conduct' })} />
          <Button small variant="ghost" label={t.me.privacy} onPress={() => openTarget({ route: 'privacy' })} />
        </View>
      </Screen>
    );
  }

  const remove = () =>
    Alert.alert(t.me.delete, t.me.deleteConfirm, [
      { text: t.me.cancel, style: 'cancel' },
      {
        text: t.me.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await api('DELETE', '/v1/me');
            await signOut();
          } catch (err) {
            Alert.alert(errorText(err));
          }
        },
      },
    ]);

  const going = (events.data?.items ?? []).filter((e) => e.me && new Date(e.endsAt) > new Date()).slice(0, 3);
  const extra = going.length > 0 && (
    <View style={styles.extra}>
      <Text variant="heading">{t.me.upcoming}</Text>
      {going.map((e) => (
        <EventCard key={e.id} event={e} />
      ))}
    </View>
  );
  const footer = (
    <View style={[styles.extra, { marginTop: 32 }]}>
      <Text variant="heading">{t.me.settings}</Text>
      <Card style={{ paddingVertical: 4 }}>
        {[
          {
            icon: 'Notification03Icon' as const,
            label: user.unread > 0 ? `${t.me.notifications} (${user.unread})` : t.me.notifications,
            onPress: () => router.push('/notifications'),
          },
          { icon: 'Bookmark02Icon' as const, label: t.me.bookmarks, onPress: () => router.push('/bookmarks') },
          { icon: 'Shield01Icon' as const, label: t.me.conduct, onPress: () => openTarget({ route: 'conduct' }) },
          { icon: 'SquareLock02Icon' as const, label: t.me.privacy, onPress: () => openTarget({ route: 'privacy' }) },
          { icon: 'Logout01Icon' as const, label: t.me.signOut, onPress: signOut },
        ].map((item, i) => (
          <Pressable key={item.label} onPress={item.onPress} style={[styles.perk, i > 0 && styles.perkLine]} accessibilityRole="button">
            <Icon name={item.icon} size={20} color={colors.fg} />
            <Text style={{ flex: 1, fontFamily: font.medium }}>{item.label}</Text>
            <Icon name="ArrowRight01Icon" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </Card>
      <Button variant="danger" small label={t.me.delete} icon="Delete02Icon" onPress={remove} />
    </View>
  );

  return <ProfileView member={user} mine top extra={extra || undefined} footer={footer} />;
}

const styles = StyleSheet.create({
  perk: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 14 },
  perkLine: { borderTopWidth: 1, borderTopColor: colors.line },
  perkIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 4 },
  extra: { paddingHorizontal: 16, marginTop: 20, gap: 10 },
});
