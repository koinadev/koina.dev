import type { Queryable } from "../../core/context";
import { hitsReferrers as query } from "../../queries/site.gen";

export function listReferrerHits(db: Pick<Queryable, "query">, since: string): Promise<{ referrer: string; views: number }[]> {
  return db.query<{ referrer: string; views: number }[]>(query, [since]);
}
