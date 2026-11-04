import { Pressable, StyleSheet, View } from 'react-native';
import { colors, font } from '@/lib/theme';
import { Text } from './text';

/** X'teki "Sana özel / Takip" sekmeleri gibi: altı çizili sekmeler, başlığın hemen altında. */
export function UnderlineTabs<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => onChange(o.value)} style={styles.tab}>
            <Text style={[styles.tabText, active && { color: colors.fg, fontFamily: font.bold }]}>{o.label}</Text>
            <View style={[styles.tabLine, active && { backgroundColor: colors.primaryText }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D9D7E0' },
  tab: { flex: 1, alignItems: 'center', paddingTop: 10 },
  tabText: { fontFamily: font.medium, fontSize: 15, lineHeight: 20, color: colors.muted, paddingBottom: 10 },
  tabLine: { height: 3, width: 56, borderRadius: 2, backgroundColor: 'transparent' },
});
