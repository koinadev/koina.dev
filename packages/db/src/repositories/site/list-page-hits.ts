import type { Queryable } from "../../core/context";
import { hitsPages as query } from "../../queries/site.gen";

export function listPageHits(db: Pick<Queryable, "query">, since: string): Promise<{ path: string; views: number }[]> {
  return db.query<{ path: string; views: number }[]>(query, [since]);
}
