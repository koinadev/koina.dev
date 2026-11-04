import type { Queryable } from "../../core/context";
import { sitemapProjects as query } from "../../queries/site.gen";

export function listSitemapProjects(db: Pick<Queryable, "query">, limit: number): Promise<{ slug: string; createdAt: Date }[]> {
  return db.query<{ slug: string; createdAt: Date }[]>(query, [limit]);
}
