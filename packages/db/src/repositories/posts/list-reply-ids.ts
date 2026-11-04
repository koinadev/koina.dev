import type { Queryable } from "../../core/context";
import { postReplies as query } from "../../queries/posts.gen";

export function listReplyIds(db: Pick<Queryable, "query">, postId: string, viewerId: string | null): Promise<{ id: string }[]> {
  return db.query<{ id: string }[]>(query, [postId, viewerId]);
}
