import type { Queryable } from "../../core/context";
import { memberStats as query } from "../../queries/members.gen";
import type { MemberStatsRow } from "./types";

export async function getMemberStats(db: Pick<Queryable, "query">, id: string, viewerId: string | null): Promise<MemberStatsRow> {
  const [row] = await db.query<MemberStatsRow[]>(query, [id, viewerId]);
  return row as MemberStatsRow;
}
