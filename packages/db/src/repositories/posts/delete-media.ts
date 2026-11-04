import type { Queryable } from "../../core/context";
import { mediaDelete as query } from "../../queries/posts.gen";

export async function deleteMedia(db: Pick<Queryable, "query">, id: string): Promise<void> {
  await db.query(query, [id]);
}
