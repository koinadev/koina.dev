import type { Queryable } from "../../core/context";
import { devMailInsert as query } from "../../queries/site.gen";

export async function insertDevMail(db: Pick<Queryable, "query">, m: { id: string; email: string; subject: string; body: string }): Promise<void> {
  await db.query(query, [m.id, m.email, m.subject, m.body]);
}
