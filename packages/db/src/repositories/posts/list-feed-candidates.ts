import type { Queryable } from "../../core/context";
import { feedCandidates as query } from "../../queries/posts.gen";
import type { FeedCandidateRow } from "./types";

export function listFeedCandidates(db: Pick<Queryable, "query">, viewerId: string | null, since: Date, asOf: Date, limit: number): Promise<FeedCandidateRow[]> {
  return db.query<FeedCandidateRow[]>(query, [viewerId, since, asOf, limit]);
}
