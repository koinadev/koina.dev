import type { Queryable } from "../../core/context";
import { memberSetHandle as query } from "../../queries/members.gen";

/** Kullanıcı adı yalnız boşsa yazılır (hesap açılışı). */
export async function assignHandle(db: Pick<Queryable, "query">, id: string, handle: string, locale: string): Promise<boolean> {
  return (await db.query(query, [id, handle, locale])).length > 0;
}
