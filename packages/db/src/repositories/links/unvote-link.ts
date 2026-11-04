import type { Queryable } from "../../core/context";
import { linkUnvote as query } from "../../queries/links.gen";

export async function unvoteLink(db: Pick<Queryable, "query">, linkId: string, userId: string): Promise<void> {
  await db.query(query, [linkId, userId]);
}
