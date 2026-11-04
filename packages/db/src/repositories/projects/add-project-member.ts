import type { Queryable } from "../../core/context";
import { projectMemberAdd as query } from "../../queries/projects.gen";

export async function addProjectMember(db: Pick<Queryable, "query">, projectId: string, userId: string): Promise<void> {
  await db.query(query, [projectId, userId]);
}
