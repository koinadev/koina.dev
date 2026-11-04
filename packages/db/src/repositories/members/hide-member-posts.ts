import type { Queryable } from "../../core/context";
import { memberHidePosts as query } from "../../queries/members.gen";

export async function hideMemberPosts(db: Pick<Queryable, "query">, id: string): Promise<void> {
  await db.query(query, [id]);
}
