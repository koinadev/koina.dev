import type { Queryable } from "../../core/context";
import { mediaOrphans as query } from "../../queries/posts.gen";

export function listOrphanMedia(db: Pick<Queryable, "query">, before: Date): Promise<{ id: string; key: string }[]> {
  return db.query<{ id: string; key: string }[]>(query, [before]);
}
