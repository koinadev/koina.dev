import type { Queryable } from "../../core/context";
import { bookmarksOf as query } from "../../queries/posts.gen";
import type { PostCursorRow } from "./types";

export function listBookmarkIds(db: Pick<Queryable, "query">, userId: string, before: Date, limit: number): Promise<PostCursorRow[]> {
  return db.query<PostCursorRow[]>(query, [userId, before, limit]);
}
