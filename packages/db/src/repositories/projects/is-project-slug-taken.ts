import type { Queryable } from "../../core/context";
import { projectSlugTaken as query } from "../../queries/projects.gen";

export async function isProjectSlugTaken(db: Pick<Queryable, "query">, slug: string): Promise<boolean> {
  return (await db.query(query, [slug])).length > 0;
}
