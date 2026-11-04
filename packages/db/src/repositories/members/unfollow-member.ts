import type { Queryable } from "../../core/context";
import { unfollow as query } from "../../queries/members.gen";

export async function unfollowMember(db: Pick<Queryable, "query">, followerId: string, followeeId: string): Promise<void> {
  await db.query(query, [followerId, followeeId]);
}
