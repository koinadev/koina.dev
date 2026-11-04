import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { colors, font, radius } from '@/lib/theme';
import { Icon, type IconName } from './icon';
import { Text } from './text';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';

export function Button({
  label,
  icon,
  variant = 'primary',
  loading,
  small,
  onPress,
  disabled,
  ...props
}: PressableProps & { label: string; icon?: IconName; variant?: Variant; loading?: boolean; small?: boolean }) {
  const fg = variant === 'danger' ? colors.live : colors.fg;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={(e) => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        styles[variant],
        (pressed || disabled) && { opacity: disabled ? 0.5 : 0.85, transform: [{ scale: 0.98 }] },
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Icon name={icon} size={small ? 18 : 20} color={fg} />}
          <Text style={[styles.label, small && { fontSize: 14 }, { color: fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 52, paddingHorizontal: 24, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  small: { height: 40, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: font.semibold, fontSize: 16 },
  primary: { backgroundColor: colors.primary },
  outline: { borderWidth: 2, borderColor: colors.fg },
  ghost: { backgroundColor: colors.tint },
  danger: { borderWidth: 2, borderColor: colors.live },
});
