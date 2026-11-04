import { colors } from '@koina/shared/brand';

// Sitedeki "imece sofrası" dili: açık kâğıt zemin, lacivert mürekkep, sarı hap butonlar; pembe
// ve mavi yalnızca küçük vurgularda. Uygulama da yalnız açık temada çalışır.
export { colors };

export const font = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  hand: 'Caveat_600SemiBold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 12, md: 18, lg: 24, pill: 999 } as const;

/** Avatar ve proje rozetleri için markanın dört rengi; adın özetinden seçilir. */
export const swatches = [colors.primary, colors.accent, colors.squiggle, colors.tint] as const;
/** `shift`: aynı tohumdan komşu renk (profil kapağı avatarla aynı renk olmasın diye). */
export function swatchFor(seed: string, shift = 0): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return swatches[(h + shift) % swatches.length];
}
