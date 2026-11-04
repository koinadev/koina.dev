import type { Queryable } from "../../core/context";
import { sitemapPosts as query } from "../../queries/site.gen";

export function listSitemapPosts(db: Pick<Queryable, "query">, limit: number): Promise<{ id: string; createdAt: Date }[]> {
  return db.query<{ id: string; createdAt: Date }[]>(query, [limit]);
}
