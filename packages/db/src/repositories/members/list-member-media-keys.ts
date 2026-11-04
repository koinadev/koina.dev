import type { Queryable } from "../../core/context";
import { memberMediaKeys as query } from "../../queries/members.gen";

export function listMemberMediaKeys(db: Pick<Queryable, "query">, id: string): Promise<{ key: string }[]> {
  return db.query<{ key: string }[]>(query, [id]);
}
