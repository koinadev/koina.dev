import type { Queryable } from "../../core/context";
import { devMailLatest as query } from "../../queries/site.gen";

export async function findLatestDevMail(db: Pick<Queryable, "query">, email: string): Promise<{ body: string; createdAt: Date } | null> {
  const [row] = await db.query<{ body: string; createdAt: Date }[]>(query, [email]);
  return row ?? null;
}
