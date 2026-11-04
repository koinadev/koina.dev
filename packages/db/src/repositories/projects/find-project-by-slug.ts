import type { Queryable } from "../../core/context";
import { projectBySlug as query } from "../../queries/projects.gen";
import type { ProjectDetailRow } from "./types";

export async function findProjectBySlug(db: Pick<Queryable, "query">, slug: string, viewerId: string | null): Promise<ProjectDetailRow | null> {
  const [row] = await db.query<ProjectDetailRow[]>(query, [slug, viewerId]);
  return row ?? null;
}
