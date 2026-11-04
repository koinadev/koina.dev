import { Text as RNText, StyleSheet, View } from 'react-native';
import { colors, font } from '@/lib/theme';
import { Mark } from './mark';
import { Text } from './text';

/** Koina logotipi: işaret + `koina.dev`. Alan adı adın parçası; sitedeki logotiple aynı. */
export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="koina.dev">
      <Mark size={Math.round(size * 1.15)} />
      <Text style={[styles.text, { fontSize: size, lineHeight: Math.round(size * 1.3), letterSpacing: -size / 26 }]}>
        {/* İç metin RN Text: dıştaki boyutu ve yazı tipini miras alır. */}
        koina<RNText style={{ color: colors.primaryText }}>.dev</RNText>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { fontFamily: font.bold, color: colors.fg },
});
