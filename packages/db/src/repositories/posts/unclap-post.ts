import type { Queryable } from "../../core/context";
import { unclap as query } from "../../queries/posts.gen";

export async function unclapPost(db: Pick<Queryable, "query">, postId: string, userId: string): Promise<void> {
  await db.query(query, [postId, userId]);
}
