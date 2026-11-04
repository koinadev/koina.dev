import { Text as RNText, type TextProps } from 'react-native';
import { colors, font } from '@/lib/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'small' | 'label' | 'hand';

const styles: Record<Variant, object> = {
  display: { fontFamily: font.bold, fontSize: 34, lineHeight: 38, letterSpacing: -1, color: colors.fg },
  title: { fontFamily: font.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.8, color: colors.fg },
  heading: { fontFamily: font.bold, fontSize: 19, lineHeight: 24, letterSpacing: -0.3, color: colors.fg },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 24, color: colors.fg },
  small: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  label: { fontFamily: font.medium, fontSize: 14, lineHeight: 18, color: colors.muted },
  hand: { fontFamily: font.hand, fontSize: 22, lineHeight: 24, color: colors.fg },
};

export function Text({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  return <RNText {...props} style={[styles[variant], style]} />;
}
