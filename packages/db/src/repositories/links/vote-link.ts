import type { Queryable } from "../../core/context";
import { linkVote as query } from "../../queries/links.gen";

export async function voteLink(db: Pick<Queryable, "query">, linkId: string, userId: string): Promise<boolean> {
  return (await db.query(query, [linkId, userId])).length > 0;
}
