import type { Queryable } from "../../core/context";
import { postSetStatus as query } from "../../queries/posts.gen";
import type { ContentStatus } from "./types";

export async function setPostStatus(db: Pick<Queryable, "query">, id: string, status: ContentStatus): Promise<boolean> {
  return (await db.query(query, [id, status])).length > 0;
}
