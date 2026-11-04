// Haftalık canlı yayın takvimi. Yayınlar 21:00 TRT = 18:00 UTC (Türkiye'de yaz saati yok, aynı
// takvim günü) ve 90 dakika sürer. Site geri sayımı, mobil uygulama ve API'nin ürettiği yayın
// etkinlikleri bu tek listeden hesaplanır.

export interface StreamSlot {
  /** 0 = Pazar (JS `getUTCDay`). */
  weekday: number;
  title: { tr: string; en: string };
}

export const STREAM_UTC_HOUR = 18;
export const STREAM_MINUTES = 90;

export const streamSlots: StreamSlot[] = [
  { weekday: 2, title: { tr: 'Kodla Buluşma', en: 'Code Meetup' } },
];

export interface StreamOccurrence {
  /** Kararlı kimlik: `stream-2026-10-27`. Katılım kaydı bu kimliğe bağlanır. */
  id: string;
  slot: StreamSlot;
  start: Date;
  end: Date;
}

function occurrenceAt(day: Date, slot: StreamSlot): StreamOccurrence {
  const start = new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), STREAM_UTC_HOUR),
  );
  const end = new Date(start.getTime() + STREAM_MINUTES * 60_000);
  return { id: `stream-${start.toISOString().slice(0, 10)}`, slot, start, end };
}

/** `from` anından sonra BİTMEMİŞ ilk `count` yayın (şu an süren yayın dahil). */
export function upcomingStreams(from: Date, count: number): StreamOccurrence[] {
  const out: StreamOccurrence[] = [];
  const day = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  for (let i = 0; out.length < count && i < 366; i += 1) {
    const slot = streamSlots.find((s) => s.weekday === day.getUTCDay());
    if (slot) {
      const hit = occurrenceAt(day, slot);
      if (hit.end > from) out.push(hit);
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return out;
}

/** `stream-YYYY-MM-DD` kimliği gerçek bir yayın gününe mi denk geliyor? */
export function streamById(id: string): StreamOccurrence | null {
  const match = /^stream-(\d{4})-(\d{2})-(\d{2})$/.exec(id);
  if (!match) return null;
  const day = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== id.slice(7)) return null;
  const slot = streamSlots.find((s) => s.weekday === day.getUTCDay());
  return slot ? occurrenceAt(day, slot) : null;
}
