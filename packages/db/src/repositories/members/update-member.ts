import type { Queryable } from "../../core/context";
import { memberUpdate as query } from "../../queries/members.gen";
import type { MemberRow, MemberUpdate } from "./types";

/** Profilin tamamını yazar; çağıran mevcut satırla birleştirir. */
export async function updateMember(db: Pick<Queryable, "query">, id: string, p: MemberUpdate): Promise<MemberRow | null> {
  const [row] = await db.query<MemberRow[]>(query, [id, p.name, p.handle, p.bio, JSON.stringify(p.roles), JSON.stringify(p.interests), p.github, p.website, p.location]);
  return row ?? null;
}
