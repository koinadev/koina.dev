import type { Queryable } from "../../core/context";
import { eventInsert as query } from "../../queries/events.gen";
import type { NewEvent } from "./types";

export async function insertEvent(db: Pick<Queryable, "query">, e: NewEvent): Promise<void> {
  await db.query(query, [e.id, e.kind, e.title, e.description, e.startsAt, e.endsAt, e.url]);
}
