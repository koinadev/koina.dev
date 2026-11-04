import type { Queryable } from "../../core/context";
import { postMeta as query } from "../../queries/posts.gen";
import type { PostMetaRow } from "./types";

export async function findPostMeta(db: Pick<Queryable, "query">, id: string): Promise<PostMetaRow | null> {
  const [row] = await db.query<PostMetaRow[]>(query, [id]);
  return row ?? null;
}
