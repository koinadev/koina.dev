import type { Queryable } from "../../core/context";
import { projectInsert as query } from "../../queries/projects.gen";
import type { NewProject } from "./types";

export async function insertProject(db: Pick<Queryable, "query">, p: NewProject): Promise<void> {
  await db.query(query, [p.id, p.slug, p.name, p.summary, p.repoUrl, JSON.stringify(p.lookingFor), p.ownerId]);
}
