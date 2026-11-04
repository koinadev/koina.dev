import type { Queryable } from "../../core/context";
import { reportInsert as query } from "../../queries/moderation.gen";
import type { NewReport } from "./types";

/** Aynı üye aynı içeriği ikinci kez şikâyet ederse `false`. */
export async function insertReport(db: Pick<Queryable, "query">, r: NewReport): Promise<boolean> {
  return (await db.query(query, [r.id, r.reporterId, r.targetKind, r.targetId, r.reason, r.note])).length > 0;
}
