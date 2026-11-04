import type { Queryable } from "../../core/context";
import { linkTags as query } from "../../queries/links.gen";

export function listLinkTags(db: Pick<Queryable, "query">, limit: number): Promise<{ tag: string; links: number }[]> {
  return db.query<{ tag: string; links: number }[]>(query, [limit]);
}
