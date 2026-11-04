import type { Queryable } from "../../core/context";
import { projectTeam as query } from "../../queries/projects.gen";
import type { MemberRefRow } from "./types";

export function listProjectTeam(db: Pick<Queryable, "query">, projectId: string): Promise<MemberRefRow[]> {
  return db.query<MemberRefRow[]>(query, [projectId]);
}
