import type { Queryable } from "../../core/context";
import { trendingTags as query } from "../../queries/posts.gen";
import type { TrendRow } from "./types";

export function listTrendingTags(db: Pick<Queryable, "query">, since: Date, limit: number): Promise<TrendRow[]> {
  return db.query<TrendRow[]>(query, [since, limit]);
}
