import type { Queryable } from "../../core/context";
import { memberHideLinks as query } from "../../queries/members.gen";

export async function hideMemberLinks(db: Pick<Queryable, "query">, id: string): Promise<void> {
  await db.query(query, [id]);
}
