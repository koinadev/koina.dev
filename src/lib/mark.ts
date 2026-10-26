// Koina işareti: uzun bir hap (gövde) ve üç nokta. Gövde K'nın dikey çizgisi; noktalar
// bir araya gelen insanlar (imece). Mark.astro aynı geometriyi CSS değişkenleriyle çizer;
// bu dosya sabit renkli SVG gereken yerler (OG görseli, favicon) için.
export const MARK_COLORS = { stem: '#1B1F3B', top: '#FF7AA2', joint: '#3341C4', bottom: '#FFD23F' };

export const MARK_SHAPES = {
  stem: { x: 0, y: 0, width: 30, height: 96, rx: 15 },
  joint: { cx: 55, cy: 48, r: 15 },
  top: { cx: 81, cy: 15, r: 15 },
  bottom: { cx: 81, cy: 81, r: 15 },
};

export function markSvg(colors = MARK_COLORS): string {
  const { stem, joint, top, bottom } = MARK_SHAPES;
  const dot = (c: { cx: number; cy: number; r: number }, fill: string) =>
    `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${fill}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect x="${stem.x}" y="${stem.y}" width="${stem.width}" height="${stem.height}" rx="${stem.rx}" fill="${colors.stem}"/>${dot(joint, colors.joint)}${dot(top, colors.top)}${dot(bottom, colors.bottom)}</svg>`;
}
