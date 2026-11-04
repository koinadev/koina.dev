import type { Queryable } from "../../core/context";
import { subscriberUnsubscribe as query } from "../../queries/site.gen";

export async function unsubscribe(db: Pick<Queryable, "query">, token: string): Promise<{ locale: string } | null> {
  const [row] = await db.query<{ locale: string }[]>(query, [token]);
  return row ?? null;
}
