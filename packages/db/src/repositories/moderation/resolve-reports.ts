import type { Queryable } from "../../core/context";
import { reportResolve as query } from "../../queries/moderation.gen";
import type { ModTarget } from "./types";

export async function resolveReports(db: Pick<Queryable, "query">, kind: ModTarget, id: string, resolution: string): Promise<void> {
  await db.query(query, [kind, id, resolution]);
}
