// Haftalık ritmin hesapları: sıradaki etkinlik, bir aralıktaki tekrarlar ve takvim aboneliği
// (.ics). Veri sitenin `messages/*/rhythm.json` dosyasından gelir; site görünümü, geri sayım,
// .ics ve mobil takvim aynı kaynağı ve aynı hesabı kullanır.
//
// Saatler Türkiye saatidir. Türkiye 2016'dan beri yaz saati uygulamıyor, ofset sabit +03:00;
// bu yüzden saat dilimi kütüphanesi gerekmez.

export type RhythmKind = 'live' | 'discord' | 'mail';

export interface RhythmItem {
  id: string;
  /** ISO hafta günü: 1 pazartesi … 7 pazar. */
  weekday: number;
  /** `SS:dd`, Türkiye saati. */
  time: string;
  minutes: number;
  /** Yalnız ayda bir olanlarda: ayın kaçıncı o günü (1-4). */
  nth?: number;
  title: string;
  text: string;
  where: string;
  kind: RhythmKind;
}

export const TR_OFFSET_MINUTES = 180;
const DAY = 86_400_000;
const ICS_DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Bir anın Türkiye saatindeki takvim günü (UTC alanları Türkiye saatini taşır). */
function trDay(at: Date): Date {
  const shifted = new Date(at.getTime() + TR_OFFSET_MINUTES * 60_000);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

/** ISO hafta günü (1-7), Türkiye saatine göre. */
export function trWeekday(at: Date): number {
  return ((trDay(at).getUTCDay() + 6) % 7) + 1;
}

function occursOn(item: RhythmItem, day: Date): boolean {
  if (((day.getUTCDay() + 6) % 7) + 1 !== item.weekday) return false;
  return item.nth === undefined || Math.ceil(day.getUTCDate() / 7) === item.nth;
}

function startOn(item: RhythmItem, day: Date): Date {
  return new Date(day.getTime() + (parseTime(item.time) - TR_OFFSET_MINUTES) * 60_000);
}

export interface Occurrence {
  item: RhythmItem;
  start: Date;
  end: Date;
}

/**
 * `from` anında süren ya da ondan sonra başlayan ilk etkinlik. `filter` ile yalnız canlı yayınlar
 * aranabilir. Aylık olanlar yüzünden en kötü durumda ~5 hafta ileri bakılır.
 */
export function nextOccurrence(
  items: RhythmItem[],
  from: Date,
  filter: (item: RhythmItem) => boolean = () => true,
): Occurrence | null {
  const today = trDay(from);
  for (let offset = 0; offset < 40; offset++) {
    const day = new Date(today.getTime() + offset * DAY);
    const found = items
      .filter((item) => filter(item) && occursOn(item, day))
      .map((item) => {
        const start = startOn(item, day);
        return { item, start, end: new Date(start.getTime() + item.minutes * 60_000) };
      })
      .filter((o) => o.end > from)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    if (found[0]) return found[0];
  }
  return null;
}

/** `[from, to)` aralığında başlayan tüm tekrarlar, başlangıca göre sıralı. */
export function occurrencesBetween(items: RhythmItem[], from: Date, to: Date): Occurrence[] {
  const out: Occurrence[] = [];
  for (let day = trDay(from); day < to; day = new Date(day.getTime() + DAY)) {
    for (const item of items) {
      if (!occursOn(item, day)) continue;
      const start = startOn(item, day);
      if (start >= from && start < to) out.push({ item, start, end: new Date(start.getTime() + item.minutes * 60_000) });
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** ISO gün numarasının (1 = pazartesi) adı; `lang` BCP 47 etiketi (`tr-TR`). */
export function weekdayName(weekday: number, lang: string, width: 'long' | 'short' = 'long'): string {
  // 2024-01-01 pazartesi; o haftanın günleri ISO numarasıyla aynı sırada.
  return new Intl.DateTimeFormat(lang, { weekday: width, timeZone: 'UTC' }).format(Date.UTC(2024, 0, weekday));
}

/**
 * Takvim satırının insan diliyle zamanı: `Her Salı 21:00`, `Ayın 1. haftası, Cumartesi 11:00`.
 * Kalıplar içerikten gelir (`{day}`, `{n}`); dil kodda değil.
 */
export function describeSlot(item: RhythmItem, lang: string, patterns: { weekly: string; monthly: string }): string {
  const day = weekdayName(item.weekday, lang);
  return item.nth
    ? `${patterns.monthly.replace('{n}', String(item.nth))}, ${day} ${item.time}`
    : `${patterns.weekly.replace('{day}', day)} ${item.time}`;
}

// ─── .ics ─────────────────────────────────────────────────────────────────

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
}

/** RFC 5545 satır katlama: 75 sekizliyi aşan satır CRLF + boşlukla bölünür, UTF-8 karakter bölünmez. */
export function foldLine(line: string): string {
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > (out.length ? 74 : 75)) {
      out.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n ');
}

/** Bir etkinliğin ilk tekrarının yerel tarihi: 2026 başından sonraki ilk uygun gün. */
function firstLocalDate(item: RhythmItem): string {
  let day = new Date(Date.UTC(2026, 0, 1));
  while (!occursOn(item, day)) day = new Date(day.getTime() + DAY);
  const pad = (n: number) => String(n).padStart(2, '0');
  const [h, m] = item.time.split(':');
  return `${day.getUTCFullYear()}${pad(day.getUTCMonth() + 1)}${pad(day.getUTCDate())}T${h}${m}00`;
}

export interface IcsOptions {
  name: string;
  description: string;
  url: string;
  domain: string;
}

/**
 * Tekrarlayan etkinliklerden abone olunabilir takvim. Çıktı deterministik (DTSTAMP sabit): aynı
 * içerik aynı dosyayı üretir, takvim uygulamaları boşuna "değişti" görmez.
 */
export function buildIcs(items: RhythmItem[], options: IcsOptions): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${options.domain}//rhythm//TR`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(options.name)}`,
    `X-WR-CALDESC:${escapeText(options.description)}`,
    'X-WR-TIMEZONE:Europe/Istanbul',
    'REFRESH-INTERVAL;VALUE=DURATION:P1D',
    'X-PUBLISHED-TTL:P1D',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Istanbul',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0300',
    'TZOFFSETTO:+0300',
    'TZNAME:+03',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];
  for (const item of items) {
    const byDay = `${item.nth ?? ''}${ICS_DAYS[item.weekday - 1]}`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${item.id}@${options.domain}`,
      'DTSTAMP:20260101T000000Z',
      `DTSTART;TZID=Europe/Istanbul:${firstLocalDate(item)}`,
      `DURATION:PT${item.minutes}M`,
      `RRULE:FREQ=${item.nth ? 'MONTHLY' : 'WEEKLY'};BYDAY=${byDay}`,
      `SUMMARY:${escapeText(item.title)}`,
      `DESCRIPTION:${escapeText(`${item.text}\n${options.url}`)}`,
      `LOCATION:${escapeText(item.where)}`,
      `URL:${options.url}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}
