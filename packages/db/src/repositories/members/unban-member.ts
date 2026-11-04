import type { Queryable } from "../../core/context";
import { memberUnban as query } from "../../queries/members.gen";

export async function unbanMember(db: Pick<Queryable, "query">, id: string): Promise<boolean> {
  return (await db.query(query, [id])).length > 0;
}
