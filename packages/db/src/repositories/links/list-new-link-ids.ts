import type { Queryable } from "../../core/context";
import { linksNew as query } from "../../queries/links.gen";
import type { LinkCursorRow, LinkListFilter } from "./types";

export function listNewLinkIds(db: Pick<Queryable, "query">, f: LinkListFilter): Promise<LinkCursorRow[]> {
  return db.query<LinkCursorRow[]>(query, [f.before, f.category ?? null, f.search ?? null, f.tag ?? null, f.limit]);
}
