import type { Queryable } from "../../core/context";
import { hitsEvents as query } from "../../queries/site.gen";

export function listEventHits(db: Pick<Queryable, "query">, since: string): Promise<{ event: string; count: number }[]> {
  return db.query<{ event: string; count: number }[]>(query, [since]);
}
