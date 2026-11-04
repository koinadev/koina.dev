import type { Queryable } from "../../core/context";
import { postTagInsert as query } from "../../queries/posts.gen";

export async function addPostTag(db: Pick<Queryable, "query">, postId: string, tag: string): Promise<void> {
  await db.query(query, [postId, tag]);
}
