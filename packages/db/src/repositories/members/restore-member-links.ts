import type { Queryable } from "../../core/context";
import { memberRestoreLinks as query } from "../../queries/members.gen";

export async function restoreMemberLinks(db: Pick<Queryable, "query">, id: string): Promise<void> {
  await db.query(query, [id]);
}
