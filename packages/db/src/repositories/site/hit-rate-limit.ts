import type { Queryable } from "../../core/context";
import { rateHit as query } from "../../queries/site.gen";

/** Sayaç artar; pencere içindeki toplam döner. */
export async function hitRateLimit(db: Pick<Queryable, "query">, key: string, windowStart: number): Promise<number> {
  const [row] = await db.query<{ count: number }[]>(query, [key, windowStart]);
  return row?.count ?? 0;
}
