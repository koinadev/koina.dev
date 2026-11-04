import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { colors, font, radius, swatchFor } from '@/lib/theme';
import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export function Avatar({ name, seed, size = 44 }: { name: string; seed: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toLocaleUpperCase('tr'))
    .join('');
  return (
    <View style={[styles.avatar, { width: size, height: size, backgroundColor: swatchFor(seed) }]}>
      <Text style={{ fontFamily: font.bold, fontSize: size * 0.38, lineHeight: Math.round(size * 0.5), color: colors.fg }}>{initials}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}>
      {icon && <Icon name={icon} size={16} color={colors.fg} />}
      <Text style={{ fontFamily: font.medium, fontSize: 14, color: colors.fg }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segment} accessibilityRole="tablist">
      {options.map((o) => (
        <Pressable
          key={o.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: o.value === value }}
          onPress={() => onChange(o.value)}
          style={[styles.segmentItem, o.value === value && styles.segmentActive]}>
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: o.value === value ? colors.fg : colors.muted }}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Empty({ icon, text, action }: { icon: IconName; text: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={36} color={colors.primaryText} />
      <Text variant="small" style={{ textAlign: 'center', maxWidth: 280 }}>{text}</Text>
      {action && <Button small label={action.label} onPress={action.onPress} />}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={colors.primaryText} />
    </View>
  );
}

export function ErrorNote({ text, onRetry, retryLabel }: { text: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <View style={styles.error}>
      <Text variant="small" style={{ flex: 1, color: colors.fg }}>{text}</Text>
      {onRetry && <Button small variant="outline" label={retryLabel ?? '↻'} onPress={onRetry} />}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segment: { flexDirection: 'row', backgroundColor: colors.tint, borderRadius: radius.pill, padding: 4 },
  segmentItem: { flex: 1, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.surface },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.sm,
    backgroundColor: '#FFE8EF',
  },
});
