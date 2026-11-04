import type { Queryable } from "../../core/context";
import { hitsDaily as query } from "../../queries/site.gen";

export function listDailyHits(db: Pick<Queryable, "query">, since: string): Promise<{ day: string; views: number }[]> {
  return db.query<{ day: string; views: number }[]>(query, [since]);
}
