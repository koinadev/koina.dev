import type { APIRoute } from 'astro';
import { siteConfig } from '@/config/site.config';
import { routePath } from '@/i18n/routes';
import { getMessages } from '@/messages';
import { buildIcs, type RhythmItem } from '@/lib/calendar';

// Abone olunabilir takvim (webcal). Statik dosya: içerik değişince build yenisini yazar, takvim
// uygulamaları günde bir kez çeker (REFRESH-INTERVAL).
const { rhythm } = getMessages('tr');

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL(siteConfig.url);
  const body = buildIcs(rhythm.items as RhythmItem[], {
    name: rhythm.calendarName,
    description: rhythm.description,
    url: new URL(routePath('events', 'tr'), base).href,
    domain: base.hostname,
  });
  return new Response(body, { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
};
