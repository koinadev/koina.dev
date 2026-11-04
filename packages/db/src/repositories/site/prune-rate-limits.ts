import type { Queryable } from "../../core/context";
import { ratePrune as query } from "../../queries/site.gen";

export async function pruneRateLimits(db: Pick<Queryable, "query">, before: number): Promise<void> {
  await db.query(query, [before]);
}
