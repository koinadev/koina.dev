// Uygulama simgesi, açılış görseli ve sekme ikonlarını üretir: `bun run icons`.
// Logo geometrisi @koina/shared/brand'den, sekme ikonları Hugeicons'tan gelir; sistem sekme
// çubuğu SVG kabul etmediği için ikonlar şablon (tek renk) PNG olarak yazılır.
import * as hugeicons from '@hugeicons/core-free-icons';
import { colors, MARK_COLORS, markSvg } from '@koina/shared/brand';
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const out = (p: string) => resolve(import.meta.dirname, '../assets/images', p);

function png(svg: string, width: number, file: string) {
  mkdirSync(dirname(out(file)), { recursive: true });
  writeFileSync(out(file), new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng());
}

/** İşareti `size` karelik tuvalde `pad` boşlukla ortalar; `bg` verilirse zemin boyanır. */
function tile(size: number, pad: number, bg: string | null, mark = MARK_COLORS, radius = 0): string {
  const inner = size - pad * 2;
  const markBody = markSvg(mark).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const back = bg ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${back}<g transform="translate(${pad} ${pad}) scale(${inner / 96})">${markBody}</g></svg>`;
}

// Simge: sarı zemin, alt nokta lacivert (favicon ile aynı). iOS köşeleri kendisi yuvarlar.
const onYellow = { ...MARK_COLORS, bottom: colors.fg };
png(tile(1024, 220, colors.primary, onYellow), 1024, 'icon.png');
png(tile(1024, 0, null), 512, 'splash-icon.png');
png(tile(48, 0, colors.primary, onYellow, 11), 48, 'favicon.png');
// Android uyarlanabilir simge: ön plan güvenli alanın (ortadaki %66) içinde kalmalı.
png(tile(1024, 330, null, onYellow), 1024, 'android-icon-foreground.png');
png(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="${colors.primary}"/></svg>`, 1024, 'android-icon-background.png');
const mono = { stem: '#000', top: '#000', joint: '#000', bottom: '#000' };
png(tile(1024, 330, null, mono), 1024, 'android-icon-monochrome.png');

// Sekme ikonları: siyah şablon, sistem rengi kendisi boyar.
type IconData = [string, Record<string, string | number>][];
function iconSvg(data: IconData): string {
  const body = data
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs)
        .filter(([k]) => k !== 'key')
        .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}="${k === 'strokeWidth' ? 1.8 : v}"`)
        .join(' ');
      return `<${tag} ${a.replaceAll('currentColor', '#000')}/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">${body}</svg>`;
}

const tabs = {
  home: 'Home03Icon',
  events: 'Calendar03Icon',
  feed: 'BubbleChatIcon',
  explore: 'Compass01Icon',
  me: 'UserCircleIcon',
} as const;
for (const [name, icon] of Object.entries(tabs)) {
  const svg = iconSvg((hugeicons as unknown as Record<string, IconData>)[icon]);
  for (const scale of [1, 2, 3]) {
    png(svg, 25 * scale, `tabs/${name}${scale === 1 ? '' : `@${scale}x`}.png`);
  }
}
console.log('simgeler yazıldı');
