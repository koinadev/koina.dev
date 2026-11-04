import { describe, expect, it } from 'vitest';
import { streamById, upcomingStreams } from '../src/schedule';

describe('upcomingStreams', () => {
  it('bir sonraki Cumartesi yayınlarını 17:00 UTC olarak verir', () => {
    // 2026-10-26 Pazartesi.
    const [a, b] = upcomingStreams(new Date('2026-10-26T12:00:00Z'), 2);
    expect(a.id).toBe('stream-2026-10-31');
    expect(a.start.toISOString()).toBe('2026-10-31T17:00:00.000Z');
    expect(a.slot.title.tr).toBe('Kodla Buluşma');
    expect(b.id).toBe('stream-2026-11-07');
  });
  it('süren yayını hâlâ listeler', () => {
    const [a] = upcomingStreams(new Date('2026-10-31T17:30:00Z'), 1);
    expect(a.id).toBe('stream-2026-10-31');
  });
  it('biten yayını atlar', () => {
    const [a] = upcomingStreams(new Date('2026-10-31T18:31:00Z'), 1);
    expect(a.id).toBe('stream-2026-11-07');
  });
});

describe('streamById', () => {
  it('yayın gününü tanır, diğer günleri ve bozuk tarihleri reddeder', () => {
    expect(streamById('stream-2026-10-31')?.slot.weekday).toBe(6);
    expect(streamById('stream-2026-11-01')).toBeNull();
    expect(streamById('stream-2026-02-31')).toBeNull();
    expect(streamById('meetup-1')).toBeNull();
  });
});
