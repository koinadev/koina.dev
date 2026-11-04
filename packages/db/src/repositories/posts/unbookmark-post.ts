import type { Queryable } from "../../core/context";
import { unbookmark as query } from "../../queries/posts.gen";

export async function unbookmarkPost(db: Pick<Queryable, "query">, postId: string, userId: string): Promise<void> {
  await db.query(query, [postId, userId]);
}
