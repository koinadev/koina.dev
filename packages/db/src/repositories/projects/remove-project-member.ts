import type { Queryable } from "../../core/context";
import { projectMemberRemove as query } from "../../queries/projects.gen";

export async function removeProjectMember(db: Pick<Queryable, "query">, projectId: string, userId: string): Promise<void> {
  await db.query(query, [projectId, userId]);
}
