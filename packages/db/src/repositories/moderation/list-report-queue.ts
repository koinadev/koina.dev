import type { Queryable } from "../../core/context";
import { reportQueue as query } from "../../queries/moderation.gen";
import type { ReportQueueRow } from "./types";

export function listReportQueue(db: Pick<Queryable, "query">, limit: number): Promise<ReportQueueRow[]> {
  return db.query<ReportQueueRow[]>(query, [limit]);
}
