import { fail } from './errors';

/** Zaman imleci: ISO tarih. Yoksa "şimdiden eski" anlamında uzak bir gelecek. */
export function timeCursor(raw: string | undefined): Date {
  if (!raw) return new Date(Date.now() + 60_000);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) fail('INVALID_INPUT');
  return date;
}

/** Sıralı listeler için anlık görüntü imleci: hangi andaki sıralama ve kaçıncı sıradan devam edileceği. */
export interface RankCursor {
  asOf: Date;
  offset: number;
}

export function encodeRankCursor({ asOf, offset }: RankCursor): string {
  return btoa(JSON.stringify({ a: asOf.toISOString(), o: offset })).replace(/=+$/, '');
}

export function decodeRankCursor(raw: string | undefined): RankCursor {
  if (!raw) return { asOf: new Date(), offset: 0 };
  try {
    const { a, o } = JSON.parse(atob(raw)) as { a: string; o: number };
    const asOf = new Date(a);
    if (Number.isNaN(asOf.getTime()) || !Number.isInteger(o) || o < 0 || o > 1000) throw new Error('cursor');
    return { asOf, offset: o };
  } catch {
    fail('INVALID_INPUT');
  }
}
