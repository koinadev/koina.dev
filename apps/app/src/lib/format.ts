// Saf yardımcılar: React'e ve tarayıcıya bağlı değiller, bu yüzden birim testleri var (format.test.ts).
import { MENTION_PATTERN, TAG_PATTERN, URL_PATTERN } from '@koina/shared/api';
import { colors } from '@koina/shared/brand';

/** Avatar ve proje rozetleri için markanın dört rengi; adın özetinden seçilir (mobille aynı). */
export const swatches = [colors.primary, colors.accent, colors.squiggle, colors.tint] as const;
export function swatchFor(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return swatches[h % swatches.length];
}

export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toLocaleUpperCase('tr'))
      .join('') || '?'
  );
}

export type Segment = { kind: 'text'; value: string } | { kind: 'link'; value: string; href: string };

// Sondaki noktalama bağlantıya dahil edilmez: "bkz. https://x.dev." cümlesinde nokta metinde kalır.
const URL_RE = /\bhttps?:\/\/[^\s<>"']+/g;
const TRAILING = /[.,;:!?)\]}'"»]+$/;

/** Gönderi metnini düz metin ve bağlantı parçalarına böler; HTML üretmez, React kaçışı korunur. */
export function linkify(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    let url = match[0];
    const tail = TRAILING.exec(url)?.[0] ?? '';
    if (tail) url = url.slice(0, -tail.length);
    const start = match.index;
    if (start > last) out.push({ kind: 'text', value: text.slice(last, start) });
    out.push({ kind: 'link', value: url.replace(/^https?:\/\//, ''), href: url });
    last = start + url.length;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out;
}

const UNITS = {
  tr: { now: 'şimdi', m: 'dk', h: 'sa', d: 'g' },
  en: { now: 'now', m: 'm', h: 'h', d: 'd' },
} as const;

/** Akıştaki kısa zaman: "5 dk", "3 sa", "2 g"; bir haftadan eskiyse gün ve ay. */
export function shortAgo(iso: string, now: Date, locale: 'tr' | 'en'): string {
  const then = new Date(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  const u = UNITS[locale];
  const join = (n: number, unit: string) => (locale === 'tr' ? `${n} ${unit}` : `${n}${unit}`);
  if (minutes < 1) return u.now;
  if (minutes < 60) return join(minutes, u.m);
  if (minutes < 1440) return join(Math.floor(minutes / 60), u.h);
  if (minutes < 10_080) return join(Math.floor(minutes / 1440), u.d);
  return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    ...(then.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  }).format(then);
}

/** Türkiye saatine göre takvim günü (`2026-10-27`). Yayın saatleri Türkiye saati; gün de öyle. */
export function trDayKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date(iso));
}

/** Başlangıca göre sıralı etkinlikleri gün gün gruplar; sıra korunur. */
export function groupByDay<T extends { startsAt: string }>(items: T[]): { day: string; items: T[] }[] {
  const groups: { day: string; items: T[] }[] = [];
  for (const item of items) {
    const day = trDayKey(item.startsAt);
    const last = groups.at(-1);
    if (last?.day === day) last.items.push(item);
    else groups.push({ day, items: [item] });
  }
  return groups;
}

/** Blog beslemesindeki göreli yolları (`/tr/blog/x`, `/_image?...`) sitenin köküne bağlar. */
export function resolveUrl(path: string, base: string): string {
  try {
    return new URL(path, `${base}/`).toString();
  } catch {
    return path;
  }
}

/** Girişten sonra dönülecek yol: yalnız uygulama içi mutlak yol; `//başka.site` açık yönlendirme olurdu. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/home';
  return next.startsWith('/giris') ? '/home' : next;
}

export type RichSegment =
  | { kind: 'text'; value: string }
  | { kind: 'url'; value: string; href: string }
  | { kind: 'tag'; value: string; tag: string }
  | { kind: 'mention'; value: string; handle: string };

interface Hit {
  start: number;
  end: number;
  seg: RichSegment;
}

/**
 * Gönderi metnini düz metin, bağlantı, `#etiket` ve `@anma` parçalarına böler. Desenler API'nin kullandıklarıyla aynı
 * (`@koina/shared/api`): sunucunun etiket saydığı her şey burada da bağlantı olur. HTML üretmez; React kaçışı korunur.
 * Bağlantının içindeki `#parça` ya da `@` etiket sayılmaz.
 */
export function richText(text: string): RichSegment[] {
  const hits: Hit[] = [];
  for (const m of text.matchAll(new RegExp(URL_PATTERN.source, URL_PATTERN.flags))) {
    hits.push({ start: m.index, end: m.index + m[0].length, seg: { kind: 'url', value: m[0].replace(/^https?:\/\//, ''), href: m[0] } });
  }
  const free = (start: number, end: number) => !hits.some((h) => start < h.end && end > h.start);
  const add = (pattern: RegExp, make: (m: RegExpMatchArray) => RichSegment) => {
    for (const m of text.matchAll(new RegExp(pattern.source, pattern.flags))) {
      const start = m.index! + m[1]!.length;
      const end = m.index! + m[0].length;
      if (free(start, end)) hits.push({ start, end, seg: make(m) });
    }
  };
  add(TAG_PATTERN, (m) => ({ kind: 'tag', value: `#${m[2]}`, tag: m[2]! }));
  add(MENTION_PATTERN, (m) => ({ kind: 'mention', value: `@${m[2]}`, handle: m[2]! }));
  hits.sort((a, b) => a.start - b.start);
  const out: RichSegment[] = [];
  let last = 0;
  for (const h of hits) {
    if (h.start > last) out.push({ kind: 'text', value: text.slice(last, h.start) });
    out.push(h.seg);
    last = h.end;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out;
}

/** Meta açıklaması: tek satır, en çok `max` karakter, kelime ortasında kesmeden. */
export function excerpt(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?-]+$/, '')}…`;
}

/** Aynı kimlik iki kez gelirse (sıralı akışta sayfa kayması) ilki kalır. */
export function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

/** Virgülle yazılan ilgi alanlarını temizler: boşluk, tekrar ve uzunluk sınırı (API: 10 × 30). */
export function parseTags(input: string, max = 10): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(',')) {
    const tag = raw.trim().toLocaleLowerCase('tr').slice(0, 30);
    if (tag) seen.add(tag);
  }
  return [...seen].slice(0, max);
}
