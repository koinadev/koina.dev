import type { KoinaEvent } from '@koina/shared/api';
import { occurrencesBetween, TR_OFFSET_MINUTES, type RhythmItem } from '@koina/web/calendar';
import { content } from './content';

// Takvim ekranının verisi: API'den gelen etkinlikler (katılım kaydı tutulanlar) + sitedeki
// haftalık ritmin geri kalanı (eşli çalışma, demo, atölye). Bülten e-posta olduğu için takvimde
// yok. Kodla Buluşma ve Açık Review API'de `stream-*` olarak üretildiği için ritimden alınmaz.
const FROM_API = new Set(['code-meetup', 'open-review']);
const routine = (content.rhythm.items as RhythmItem[]).filter((i) => i.kind !== 'mail' && !FROM_API.has(i.id));

export type EntryTone = 'stream' | 'meetup' | 'demo' | 'workshop' | 'discord' | 'live';

export interface Entry {
  key: string;
  title: string;
  text: string;
  where: string | null;
  start: Date;
  end: Date;
  tone: EntryTone;
  /** Yalnız API etkinliklerinde: katılım ve bağlantı. */
  event?: KoinaEvent;
}

export const DAY_MS = 86_400_000;

/** Türkiye saatine göre gün anahtarı: `2026-10-27`. */
export function dayKey(at: Date): string {
  return new Date(at.getTime() + TR_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

/**
 * Bugünden başlayan `count` gün (Türkiye günleri). Her gün Türkiye saatiyle öğlen olarak döner:
 * hangi saat diliminde biçimlenirse biçimlensin aynı takvim gününe düşer.
 */
export function nextDays(now: Date, count: number): Date[] {
  const local = new Date(now.getTime() + TR_OFFSET_MINUTES * 60_000);
  const today = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return Array.from({ length: count }, (_, i) => new Date(today + i * DAY_MS + 9 * 3_600_000));
}

export function buildAgenda(events: KoinaEvent[], from: Date, to: Date): Entry[] {
  const fromApi: Entry[] = events.map((e) => ({
    key: e.id,
    title: e.title,
    text: e.description,
    where: e.kind === 'stream' ? 'YouTube, Twitch' : null,
    start: new Date(e.startsAt),
    end: new Date(e.endsAt),
    tone: e.kind,
    event: e,
  }));
  const fromRhythm: Entry[] = occurrencesBetween(routine, from, to).map((o) => ({
    key: `${o.item.id}-${dayKey(o.start)}`,
    title: o.item.title,
    text: o.item.text,
    where: o.item.where,
    start: o.start,
    end: o.end,
    tone: o.item.kind === 'discord' ? 'discord' : 'live',
  }));
  return [...fromApi, ...fromRhythm]
    .filter((e) => e.end > from && e.start < to)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}
