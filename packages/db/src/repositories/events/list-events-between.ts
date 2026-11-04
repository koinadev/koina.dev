import type { Queryable } from "../../core/context";
import { eventsBetween as query } from "../../queries/events.gen";
import type { EventRow } from "../../tables/events.gen";

export function listEventsBetween(db: Pick<Queryable, "query">, from: Date, until: Date): Promise<EventRow[]> {
  return db.query<EventRow[]>(query, [from, until]);
}
