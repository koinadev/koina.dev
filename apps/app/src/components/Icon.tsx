import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

export type { IconSvgElement };

/**
 * Hugeicons çizgi ikonu. Ad sözlüğü (mobildeki gibi) yerine ikon doğrudan import ediliyor:
 * web paketinde kullanılmayan binlerce ikon böylece pakete girmiyor.
 * Varsayılan olarak dekoratif; anlamı düğmenin etiketi taşır.
 */
export function Icon({ icon, size = 22, strokeWidth = 1.7, className }: {
  icon: IconSvgElement;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <HugeiconsIcon icon={icon} size={size} strokeWidth={strokeWidth} color="currentColor" className={className} aria-hidden />
  );
}
