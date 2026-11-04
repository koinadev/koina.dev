import type { Queryable } from "../../core/context";
import { repost as query } from "../../queries/posts.gen";

export async function repostPost(db: Pick<Queryable, "query">, postId: string, userId: string): Promise<boolean> {
  return (await db.query(query, [postId, userId])).length > 0;
}
