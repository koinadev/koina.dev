import { TextInput, View, type TextInputProps } from 'react-native';
import { colors, font, radius } from '@/lib/theme';
import { Text } from './text';

export const inputStyle = {
  minHeight: 54,
  borderRadius: radius.md,
  borderWidth: 2,
  borderColor: colors.line,
  backgroundColor: colors.surface,
  paddingHorizontal: 18,
  paddingVertical: 14,
  fontFamily: font.regular,
  fontSize: 17,
  color: colors.fg,
} as const;

/** Etiketli metin alanı; etiket ekran okuyucuya da ad olarak verilir. */
export function Field({ label, style, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label && <Text variant="label">{label}</Text>}
      <TextInput
        accessibilityLabel={label ?? props.placeholder}
        placeholderTextColor={colors.muted}
        style={[inputStyle, props.multiline && { minHeight: 120, textAlignVertical: 'top' }, style]}
        {...props}
      />
    </View>
  );
}
