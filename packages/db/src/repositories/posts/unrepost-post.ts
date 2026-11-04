import type { Queryable } from "../../core/context";
import { unrepost as query } from "../../queries/posts.gen";

export async function unrepostPost(db: Pick<Queryable, "query">, postId: string, userId: string): Promise<void> {
  await db.query(query, [postId, userId]);
}
