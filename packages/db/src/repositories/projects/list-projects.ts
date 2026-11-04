import type { Queryable } from "../../core/context";
import { projectList as query } from "../../queries/projects.gen";
import type { ProjectListFilter, ProjectRow } from "./types";

export function listProjects(db: Pick<Queryable, "query">, viewerId: string | null, f: ProjectListFilter): Promise<ProjectRow[]> {
  return db.query<ProjectRow[]>(query, [viewerId, f.before, f.status ?? null, f.role ?? null, f.search ?? null, f.member ?? null, f.limit]);
}
