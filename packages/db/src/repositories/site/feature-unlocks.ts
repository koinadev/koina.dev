import type { Queryable } from "../../core/context";
import { featureUnlockInsert, featureUnlockList, memberCount } from "../../queries/site.gen";

export async function countMembers(db: Pick<Queryable, "query">): Promise<number> {
  const [row] = await db.query<{ members: number }[]>(memberCount);
  return row?.members ?? 0;
}

export async function listFeatureUnlocks(db: Pick<Queryable, "query">): Promise<string[]> {
  const rows = await db.query<{ feature: string }[]>(featureUnlockList);
  return rows.map((r) => r.feature);
}

export async function insertFeatureUnlock(db: Pick<Queryable, "query">, feature: string): Promise<void> {
  await db.query(featureUnlockInsert, [feature]);
}
