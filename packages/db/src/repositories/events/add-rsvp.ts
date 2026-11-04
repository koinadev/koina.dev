import type { Queryable } from "../../core/context";
import { rsvpAdd as query } from "../../queries/events.gen";

export async function addRsvp(db: Pick<Queryable, "query">, eventId: string, userId: string): Promise<void> {
  await db.query(query, [eventId, userId]);
}
