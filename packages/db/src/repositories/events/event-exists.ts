import type { Queryable } from "../../core/context";
import { eventExists as query } from "../../queries/events.gen";

export async function eventExists(db: Pick<Queryable, "query">, id: string): Promise<boolean> {
  return (await db.query(query, [id])).length > 0;
}
