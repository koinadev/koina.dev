import type { Queryable } from "../../core/context";
import { postInsert as query } from "../../queries/posts.gen";
import type { NewPost } from "./types";

export async function insertPost(db: Pick<Queryable, "query">, p: NewPost): Promise<void> {
  await db.query(query, [p.id, p.userId, p.projectId, p.parentId, p.rootId, p.quoteId, p.body, p.linkUrl, p.linkHash]);
}
