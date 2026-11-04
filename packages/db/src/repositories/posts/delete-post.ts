import type { Queryable } from "../../core/context";
import { postDelete as query } from "../../queries/posts.gen";

export async function deletePost(db: Pick<Queryable, "query">, id: string): Promise<boolean> {
  return (await db.query(query, [id])).length > 0;
}
