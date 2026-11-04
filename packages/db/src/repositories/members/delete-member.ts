import type { Queryable } from "../../core/context";
import { memberDelete as query } from "../../queries/members.gen";

export async function deleteMember(db: Pick<Queryable, "query">, id: string): Promise<boolean> {
  return (await db.query(query, [id])).length > 0;
}
