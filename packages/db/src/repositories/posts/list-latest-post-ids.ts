import type { Queryable } from "../../core/context";
import { feedLatest as query } from "../../queries/posts.gen";
import type { LatestPostFilter, PostCursorRow } from "./types";

export function listLatestPostIds(db: Pick<Queryable, "query">, f: LatestPostFilter): Promise<PostCursorRow[]> {
  return db.query<PostCursorRow[]>(query, [f.before, f.tag ?? null, f.project ?? null, f.author ?? null, f.onlyProjects ?? false, f.search ?? null, f.limit]);
}
