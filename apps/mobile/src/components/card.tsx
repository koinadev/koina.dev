import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radius } from '@/lib/theme';

/** `fill`: kart bulunduğu alanı doldurur (yan yana eşit genişlik ve yükseklikte karolar). */
export function Card({ style, onPress, fill, ...props }: ViewProps & { onPress?: () => void; fill?: boolean }) {
  if (onPress) {
    return (
      // Yerleşim stili (satır, boşluk) içerideki View'a gider; Pressable yalnız basılma geri bildirimi.
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [fill && { flex: 1 }, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}>
        <View style={[styles.card, fill && { flex: 1 }, style]} {...props} />
      </Pressable>
    );
  }
  return <View style={[styles.card, fill && { flex: 1 }, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
  },
});
