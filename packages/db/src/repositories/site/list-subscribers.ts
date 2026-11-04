import type { Queryable } from "../../core/context";
import { subscriberList as query } from "../../queries/site.gen";
import type { SubscriberListRow } from "./types";

export function listSubscribers(db: Pick<Queryable, "query">): Promise<SubscriberListRow[]> {
  return db.query<SubscriberListRow[]>(query, []);
}
