import type { Queryable } from "../../core/context";
import { rsvpCount as query } from "../../queries/events.gen";

export async function countMemberRsvps(db: Pick<Queryable, "query">, userId: string): Promise<number> {
  const [row] = await db.query<{ events: number }[]>(query, [userId]);
  return row?.events ?? 0;
}
