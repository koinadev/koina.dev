import type { Queryable } from "../../core/context";
import { linkCandidates as query } from "../../queries/links.gen";
import type { LinkCandidateRow, LinkListFilter } from "./types";

export function listLinkCandidates(db: Pick<Queryable, "query">, f: Omit<LinkListFilter, "before">): Promise<LinkCandidateRow[]> {
  return db.query<LinkCandidateRow[]>(query, [f.category ?? null, f.search ?? null, f.tag ?? null, f.limit]);
}
