import type { Queryable } from "../../core/context";
import { subscriberUpsert as query } from "../../queries/site.gen";

export async function upsertSubscriber(db: Pick<Queryable, "query">, email: string, locale: string, token: string): Promise<{ token: string; confirmedAt: Date | null }> {
  const [row] = await db.query<{ token: string; confirmedAt: Date | null }[]>(query, [email, locale, token]);
  return row as { token: string; confirmedAt: Date | null };
}
