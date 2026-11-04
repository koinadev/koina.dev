import type { Queryable } from "../../core/context";
import { memberDeleteSessions as query } from "../../queries/members.gen";

export async function deleteMemberSessions(db: Pick<Queryable, "query">, id: string): Promise<void> {
  await db.query(query, [id]);
}
