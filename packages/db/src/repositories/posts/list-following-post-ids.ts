import type { Queryable } from "../../core/context";
import { feedFollowing as query } from "../../queries/posts.gen";
import type { FollowingPostRow } from "./types";

export function listFollowingPostIds(db: Pick<Queryable, "query">, viewerId: string, before: Date, limit: number): Promise<FollowingPostRow[]> {
  return db.query<FollowingPostRow[]>(query, [viewerId, before, limit]);
}
