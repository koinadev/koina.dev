import type { Queryable } from "../../core/context";
import { eventDelete as query } from "../../queries/events.gen";

export async function deleteEvent(db: Pick<Queryable, "query">, id: string): Promise<void> {
  await db.query(query, [id]);
}
