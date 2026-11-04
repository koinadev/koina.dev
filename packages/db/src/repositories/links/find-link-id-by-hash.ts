import type { Queryable } from "../../core/context";
import { linkByHash as query } from "../../queries/links.gen";

export async function findLinkIdByHash(db: Pick<Queryable, "query">, hash: string): Promise<{ id: string } | null> {
  const [row] = await db.query<{ id: string }[]>(query, [hash]);
  return row ?? null;
}
