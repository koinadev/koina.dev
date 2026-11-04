import * as icons from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react-native';
import { colors } from '@/lib/theme';

/** Sitedeki Icon.astro'nun karşılığı: Hugeicons adıyla çizer (`'GiftIcon'`). */
export type IconName = Extract<keyof typeof icons, `${string}Icon`>;

// Ad, derleme zamanında `IconName` ile doğrulanıyor; çalışma zamanında düz sözlük.
const registry = icons as unknown as Record<IconName, IconSvgElement>;

export function Icon({ name, size = 22, color = colors.fg, strokeWidth = 1.6 }: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return <HugeiconsIcon icon={registry[name]} size={size} color={color} strokeWidth={strokeWidth} />;
}
