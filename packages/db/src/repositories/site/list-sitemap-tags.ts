import type { Queryable } from "../../core/context";
import { sitemapTags as query } from "../../queries/site.gen";

export function listSitemapTags(db: Pick<Queryable, "query">, limit: number): Promise<{ tag: string; createdAt: Date }[]> {
  return db.query<{ tag: string; createdAt: Date }[]>(query, [limit]);
}
