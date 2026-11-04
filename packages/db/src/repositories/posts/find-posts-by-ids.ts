import type { Queryable } from "../../core/context";
import { postsByIds as query } from "../../queries/posts.gen";
import type { PostRow } from "./types";

/** Kimlikleri tam gönderiye çevirir; sıra korunmaz, çağıran sıralar. */
export function findPostsByIds(db: Pick<Queryable, "query">, ids: readonly string[], viewerId: string | null): Promise<PostRow[]> {
  return db.query<PostRow[]>(query, [JSON.stringify(ids), viewerId]);
}
