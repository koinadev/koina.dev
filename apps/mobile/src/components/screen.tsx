import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '@/lib/theme';
import { Text } from './text';

/** Kaydırılabilir ekran kabı: büyük başlık, isteğe bağlı çekip-yenile. */
export function Screen({
  title,
  lead,
  children,
  refreshing,
  onRefresh,
  inset = true,
  header,
}: {
  title?: string;
  lead?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  inset?: boolean;
  header?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.root}
      // Güvenli alan payı elle veriliyor; iOS'un otomatik payı açık kalsa iki kez eklenirdi.
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingTop: inset ? insets.top + space.lg : space.lg, paddingBottom: insets.bottom + 96 }}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}>
      <View style={styles.body}>
        {header}
        {title && <Text variant="title">{title}</Text>}
        {lead && <Text variant="small" style={{ fontSize: 15, lineHeight: 22 }}>{lead}</Text>}
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: space.lg, gap: space.md, width: '100%', maxWidth: 720, alignSelf: 'center' },
});
