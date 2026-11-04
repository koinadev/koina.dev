import { describe, expect, it } from 'vitest';
import { buildIcs, foldLine, nextOccurrence, trWeekday, type RhythmItem } from '../lib/calendar';
import { getMessages } from '../messages';

const demoFriday: RhythmItem = {
  id: 'demo-friday',
  weekday: 5,
  time: '18:00',
  minutes: 60,
  nth: 3,
  title: 'Demo Cuma',
  text: '',
  where: 'Discord',
  kind: 'live',
};
const items = [...getMessages('tr').rhythm.items, demoFriday] as RhythmItem[];

describe('nextOccurrence', () => {
  it('Türkiye saatine göre sıradaki etkinliği bulur', () => {
    // 2026-10-26 pazartesi 12:00 TR (09:00 UTC) → salı 21:00 TR = 18:00 UTC.
    const next = nextOccurrence(items, new Date('2026-10-26T09:00:00Z'), (i) => i.kind !== 'mail');
    expect(next?.item.id).toBe('code-meetup');
    expect(next?.start.toISOString()).toBe('2026-10-27T18:00:00.000Z');
  });

  it('süren etkinliği döndürür', () => {
    const next = nextOccurrence(items, new Date('2026-10-27T18:30:00Z'));
    expect(next?.item.id).toBe('code-meetup');
  });

  it('aylık etkinliği yalnız ayın doğru haftasında sayar', () => {
    const fridays = (i: RhythmItem) => i.id === 'demo-friday';
    // Ekim 2026'nın 3. cuması 16'sı; 30'u 5. cuma, sıradaki kasımın 3. cuması (20'si).
    expect(nextOccurrence(items, new Date('2026-10-01T00:00:00Z'), fridays)?.start.toISOString()).toBe(
      '2026-10-16T15:00:00.000Z',
    );
    expect(nextOccurrence(items, new Date('2026-10-17T00:00:00Z'), fridays)?.start.toISOString()).toBe(
      '2026-11-20T15:00:00.000Z',
    );
  });

  it('gece yarısına yakın UTC anını Türkiye gününe çevirir', () => {
    // 2026-10-25 22:30 UTC = 26 Ekim pazartesi 01:30 TR.
    expect(trWeekday(new Date('2026-10-25T22:30:00Z'))).toBe(1);
  });
});

describe('buildIcs', () => {
  const ics = buildIcs(items, {
    name: 'koina.dev etkinlikleri',
    description: 'Her hafta; aynı gün',
    url: 'https://koina.dev/tr/etkinlikler',
    domain: 'koina.dev',
  });

  it('her etkinlik için tekrar kuralı yazar', () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(items.length);
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=TU');
    expect(ics).toContain('RRULE:FREQ=MONTHLY;BYDAY=3FR');
    expect(ics).toContain('DTSTART;TZID=Europe/Istanbul:20260106T210000');
  });

  it('CRLF kullanır, metni kaçırır, satırları 75 sekizlide katlar', () => {
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
    expect(ics).toContain(String.raw`X-WR-CALDESC:Her hafta\; aynı gün`);
    for (const line of ics.split('\r\n'))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it('çok baytlı karakteri bölmez', () => {
    const folded = foldLine(`SUMMARY:${'ş'.repeat(60)}`);
    expect(folded.split('\r\n ').join('')).toBe(`SUMMARY:${'ş'.repeat(60)}`);
  });
});
