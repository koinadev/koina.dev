import type { Queryable } from "../../core/context";
import { memberById as query } from "../../queries/members.gen";
import type { MemberRow } from "./types";

export async function findMemberById(db: Pick<Queryable, "query">, id: string): Promise<MemberRow | null> {
  const [row] = await db.query<MemberRow[]>(query, [id]);
  return row ?? null;
}
