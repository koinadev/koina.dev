import type { Queryable } from "../../core/context";
import { postDuplicate as query } from "../../queries/posts.gen";

export async function hasDuplicatePost(db: Pick<Queryable, "query">, userId: string, body: string, since: Date): Promise<boolean> {
  return (await db.query(query, [userId, body, since])).length > 0;
}
