import type { Queryable } from "../../core/context";
import { memberHandleTaken as query } from "../../queries/members.gen";

/** Kullanıcı adı başka bir üyede mi. */
export async function isHandleTaken(db: Pick<Queryable, "query">, handle: string, exceptId: string): Promise<boolean> {
  return (await db.query(query, [handle, exceptId])).length > 0;
}
