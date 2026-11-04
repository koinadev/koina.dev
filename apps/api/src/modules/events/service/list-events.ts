import type { KoinaEvent, Locale } from '@koina/shared/api';
import { upcomingStreams } from '@koina/shared/schedule';
import { countRsvps, listEventsBetween } from '@koina/db/repositories/events';
import type { AppContext } from '../../../core/types/env';

const streamCopy = {
  tr: 'Her Cumartesi 20:00 canlı yayındayız. Herkes izleyebilir, sohbete katılmak serbest.',
  en: "We're live every Saturday at 20:00 (Istanbul). Anyone can watch; join the chat anytime.",
};

/** Canlı yayınlar (takvimden üretilir) + elle eklenen etkinlikler, başlangıca göre sıralı; katılım sayıları tek sorguda. */
export async function listEvents(c: AppContext): Promise<Response> {
  const locale: Locale = c.req.query('locale') === 'en' ? 'en' : 'tr';
  const from = new Date();
  const streams: KoinaEvent[] = upcomingStreams(from, 8).map((s) => ({
    id: s.id,
    kind: 'stream',
    title: s.slot.title[locale],
    description: streamCopy[locale],
    startsAt: s.start.toISOString(),
    endsAt: s.end.toISOString(),
    url: 'https://www.youtube.com/@koinadev/live',
    going: 0,
  }));
  const until = new Date(streams.at(-1)?.endsAt ?? from.toISOString());
  const db = c.get('db');
  const stored = await listEventsBetween(db, from, until);
  const list: KoinaEvent[] = [
    ...streams,
    ...stored.map((e) => ({
      id: e.id,
      kind: e.kind as KoinaEvent['kind'],
      title: e.title,
      description: e.description,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      url: e.url,
      going: 0,
    })),
  ].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const viewer = c.get('viewer');
  const counts = new Map((await countRsvps(db, list.map((e) => e.id), viewer?.id ?? null)).map((r) => [r.eventId, r]));
  for (const e of list) {
    const hit = counts.get(e.id);
    e.going = hit?.going ?? 0;
    if (viewer) e.me = hit?.me ?? false;
  }
  return c.json({ items: list, next: null });
}
