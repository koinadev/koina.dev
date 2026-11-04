import type { Queryable } from "../../core/context";
import { rsvpRemove as query } from "../../queries/events.gen";

export async function removeRsvp(db: Pick<Queryable, "query">, eventId: string, userId: string): Promise<void> {
  await db.query(query, [eventId, userId]);
}
