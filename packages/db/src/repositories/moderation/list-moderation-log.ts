import type { Queryable } from "../../core/context";
import { moderationLogList as query } from "../../queries/moderation.gen";
import type { ModerationLogEntry } from "./types";

export function listModerationLog(db: Pick<Queryable, "query">, limit: number): Promise<ModerationLogEntry[]> {
  return db.query<ModerationLogEntry[]>(query, [limit]);
}
