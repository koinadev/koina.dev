import type { Queryable } from "../../core/context";
import { projectIdBySlug as query } from "../../queries/projects.gen";

export async function findProjectIdBySlug(db: Pick<Queryable, "query">, slug: string): Promise<{ id: string; ownerId: string } | null> {
  const [row] = await db.query<{ id: string; ownerId: string }[]>(query, [slug]);
  return row ?? null;
}
