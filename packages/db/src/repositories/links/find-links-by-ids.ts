import type { Queryable } from "../../core/context";
import { linksByIds as query } from "../../queries/links.gen";
import type { LinkRow } from "./types";

export function findLinksByIds(db: Pick<Queryable, "query">, ids: readonly string[], viewerId: string | null): Promise<LinkRow[]> {
  return db.query<LinkRow[]>(query, [JSON.stringify(ids), viewerId]);
}
