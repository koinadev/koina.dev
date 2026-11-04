import type { Queryable } from "../../core/context";
import { memberRestorePosts as query } from "../../queries/members.gen";

export async function restoreMemberPosts(db: Pick<Queryable, "query">, id: string): Promise<void> {
  await db.query(query, [id]);
}
