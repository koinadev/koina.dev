import type { Queryable } from "../../core/context";
import { rsvpCounts as query } from "../../queries/events.gen";
import type { RsvpCountRow } from "./types";

export function countRsvps(db: Pick<Queryable, "query">, ids: readonly string[], viewerId: string | null): Promise<RsvpCountRow[]> {
  return db.query<RsvpCountRow[]>(query, [JSON.stringify(ids), viewerId]);
}
