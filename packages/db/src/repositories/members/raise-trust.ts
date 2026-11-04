import type { Queryable } from "../../core/context";
import { memberRaiseTrust as query } from "../../queries/members.gen";

/** Yeni hesabı olağana yükseltir: yeterince eski ve en az üç görünür gönderisi varsa. */
export async function raiseTrust(db: Pick<Queryable, "query">, id: string, olderThan: Date): Promise<boolean> {
  return (await db.query(query, [id, olderThan])).length > 0;
}
