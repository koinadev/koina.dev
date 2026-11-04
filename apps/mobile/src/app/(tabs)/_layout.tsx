import { NativeTabs } from 'expo-router/native-tabs';
import { t } from '@/lib/i18n';
import { colors } from '@/lib/theme';

// Sistem sekme çubuğu; ikonlar Hugeicons'tan üretilmiş şablon PNG'ler (scripts/build-icons.ts).
// Sıra kullanım sıklığına göre: keşfet ve akış ortada, başparmağa en yakın yerde.
export default function TabLayout() {
  return (
    <NativeTabs tintColor={colors.primaryText} labelStyle={{ selected: { color: colors.fg } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t.tabs.home}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabs/home.png')} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>{t.tabs.explore}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabs/explore.png')} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="feed">
        <NativeTabs.Trigger.Label>{t.tabs.feed}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabs/feed.png')} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="events">
        <NativeTabs.Trigger.Label>{t.tabs.events}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabs/events.png')} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="me">
        <NativeTabs.Trigger.Label>{t.tabs.me}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabs/me.png')} renderingMode="template" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
