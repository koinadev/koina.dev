import type { Queryable } from "../../core/context";
import { mediaAttach as query } from "../../queries/posts.gen";

/** Yalnız yükleyenin, henüz bağlanmamış görseli bağlanır. */
export async function attachMedia(db: Pick<Queryable, "query">, postId: string, mediaId: string, userId: string, position: number): Promise<boolean> {
  return (await db.query(query, [postId, mediaId, userId, position])).length > 0;
}
