// Koina marka sabitleri: web (palettes.css), mobil uygulama ve görsel üreticiler aynı
// değerleri buradan okur. Bir rengi değiştirirken `apps/web/src/styles/palettes.css`teki
// `--k-*` değişkenini de güncelle; ikisinin eşit kaldığını web testi denetliyor.

export const colors = {
  bg: '#FBFAF7',
  surface: '#FFFFFF',
  fg: '#1B1F3B',
  muted: '#50567A',
  primary: '#FFD23F',
  primaryText: '#3341C4',
  onPrimary: '#1B1F3B',
  accent: '#FF7AA2',
  live: '#E5484D',
  tint: '#ECEEFF',
  line: '#E7E5EE',
  squiggle: '#9FE3C0',
  ink: '#11142A',
} as const;

export type ColorName = keyof typeof colors;

// Koina işareti: uzun bir hap (gövde) ve üç nokta. Gövde K'nın dikey çizgisi; noktalar
// bir araya gelen insanlar (imece).
export type MarkColors = Record<'stem' | 'top' | 'joint' | 'bottom', string>;

export const MARK_COLORS: MarkColors = {
  stem: colors.fg,
  top: colors.accent,
  joint: colors.primaryText,
  bottom: colors.primary,
};

export const MARK_SHAPES = {
  stem: { x: 0, y: 0, width: 30, height: 96, rx: 15 },
  joint: { cx: 55, cy: 48, r: 15 },
  top: { cx: 81, cy: 15, r: 15 },
  bottom: { cx: 81, cy: 81, r: 15 },
} as const;

export function markSvg(markColors: MarkColors = MARK_COLORS): string {
  const { stem, joint, top, bottom } = MARK_SHAPES;
  const dot = (c: { cx: number; cy: number; r: number }, fill: string) =>
    `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${fill}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect x="${stem.x}" y="${stem.y}" width="${stem.width}" height="${stem.height}" rx="${stem.rx}" fill="${markColors.stem}"/>${dot(joint, markColors.joint)}${dot(top, markColors.top)}${dot(bottom, markColors.bottom)}</svg>`;
}
