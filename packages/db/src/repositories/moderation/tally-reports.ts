import type { Queryable } from "../../core/context";
import { reportTally as query } from "../../queries/moderation.gen";
import type { ModTarget, ReportTallyRow } from "./types";

export async function tallyReports(db: Pick<Queryable, "query">, kind: ModTarget, id: string): Promise<ReportTallyRow> {
  const [row] = await db.query<ReportTallyRow[]>(query, [kind, id]);
  return row as ReportTallyRow;
}
