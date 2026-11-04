import type { Queryable } from "../../core/context";
import { memberByHandle as query } from "../../queries/members.gen";
import type { MemberRow } from "./types";

export async function findMemberByHandle(db: Pick<Queryable, "query">, handle: string): Promise<MemberRow | null> {
  const [row] = await db.query<MemberRow[]>(query, [handle]);
  return row ?? null;
}
