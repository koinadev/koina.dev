import type { Queryable } from "../../core/context";
import { postMentionInsert as query } from "../../queries/posts.gen";

/** Anılan üye varsa kaydeder ve kimliğini döner. */
export async function addPostMention(db: Pick<Queryable, "query">, postId: string, handle: string): Promise<{ userId: string } | null> {
  const [row] = await db.query<{ userId: string }[]>(query, [postId, handle]);
  return row ?? null;
}
