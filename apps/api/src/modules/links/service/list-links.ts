import { linkCategories, linkSorts, type LinkCategory, type LinkSort, type Page, type Link } from '@koina/shared/api';
import { listLinkCandidates, listLinkTags, listNewLinkIds } from '@koina/db/repositories/links';
import type { AppContext } from '../../../core/types/env';
import { decodeRankCursor, encodeRankCursor, timeCursor } from '../../../core/utils/cursor';
import { searchTerm } from '../../../core/utils/fold';
import { rankLinks } from '../domain/link-ranking';
import { loadLinks } from '../utils/load-links';

const PAGE = 24;
const CANDIDATES = 300;

export interface LinkParams {
  sort?: string;
  category?: string;
  tag?: string;
  q?: string;
  cursor?: string;
}

/** Faydalı bağlantılar: öne çıkan (oy ve yaş) ya da yeni; kategori, etiket ve aramayla süzülür. */
export async function listLinks(c: AppContext, p: LinkParams): Promise<Response> {
  const sort: LinkSort = linkSorts.includes(p.sort as LinkSort) ? (p.sort as LinkSort) : 'top';
  const filter = {
    category: linkCategories.includes(p.category as LinkCategory) ? (p.category as LinkCategory) : null,
    tag: p.tag ? p.tag.trim().toLocaleLowerCase('tr').slice(0, 30) : null,
    search: searchTerm(p.q),
  };
  const db = c.get('db');
  let page: Page<Link>;
  if (sort === 'new') {
    const rows = await listNewLinkIds(db, { ...filter, before: timeCursor(p.cursor), limit: PAGE + 1 });
    page = {
      items: await loadLinks(c, rows.slice(0, PAGE).map((r) => r.id)),
      next: rows.length > PAGE ? rows[PAGE - 1]!.createdAt.toISOString() : null,
    };
  } else {
    const { asOf, offset } = decodeRankCursor(p.cursor);
    const ranked = rankLinks(await listLinkCandidates(db, { ...filter, limit: CANDIDATES }), asOf);
    page = {
      items: await loadLinks(c, ranked.slice(offset, offset + PAGE)),
      next: offset + PAGE < ranked.length ? encodeRankCursor({ asOf, offset: offset + PAGE }) : null,
    };
  }
  return c.json(page);
}

/** En çok kullanılan bağlantı etiketleri (süzgeç önerisi). */
export async function listTags(c: AppContext): Promise<Response> {
  const rows = await listLinkTags(c.get('db'), 20);
  c.header('cache-control', 'public, max-age=300');
  return c.json({ items: rows, next: null });
}
