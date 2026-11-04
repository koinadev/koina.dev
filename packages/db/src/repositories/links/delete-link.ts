import type { Queryable } from "../../core/context";
import { linkDelete as query } from "../../queries/links.gen";

export async function deleteLink(db: Pick<Queryable, "query">, id: string): Promise<boolean> {
  return (await db.query(query, [id])).length > 0;
}
