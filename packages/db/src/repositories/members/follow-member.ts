import type { Queryable } from "../../core/context";
import { follow as query } from "../../queries/members.gen";

/** Yeni takipse `true`. */
export async function followMember(db: Pick<Queryable, "query">, followerId: string, followeeId: string): Promise<boolean> {
  return (await db.query(query, [followerId, followeeId])).length > 0;
}
