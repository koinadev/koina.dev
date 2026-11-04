import type { Queryable } from "../../core/context";
import { hitInsert as query } from "../../queries/site.gen";

export async function recordHit(db: Pick<Queryable, "query">, h: { day: string; path: string; event: string; referrer: string }): Promise<void> {
  await db.query(query, [h.day, h.path, h.event, h.referrer]);
}
