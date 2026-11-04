import type { Queryable } from "../../core/context";
import { memberSetRole as query } from "../../queries/members.gen";
import type { MemberRole } from "./types";

export async function setMemberRole(db: Pick<Queryable, "query">, id: string, role: MemberRole, minTrust: number): Promise<boolean> {
  return (await db.query(query, [id, role, minTrust])).length > 0;
}
