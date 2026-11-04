import type { Queryable } from "../../core/context";
import { postAncestors as query } from "../../queries/posts.gen";

/** Üst zincir, kökten yakına. */
export function listAncestorIds(db: Pick<Queryable, "query">, postId: string): Promise<{ id: string; depth: number }[]> {
  return db.query<{ id: string; depth: number }[]>(query, [postId]);
}
