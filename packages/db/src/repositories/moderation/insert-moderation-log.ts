import type { Queryable } from "../../core/context";
import { moderationLogInsert as query } from "../../queries/moderation.gen";
import type { NewModerationLog } from "./types";

export async function insertModerationLog(db: Pick<Queryable, "query">, e: NewModerationLog): Promise<void> {
  await db.query(query, [e.id, e.actorId, e.targetKind, e.targetId, e.action, e.reason]);
}
