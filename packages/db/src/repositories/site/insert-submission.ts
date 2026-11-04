import type { Queryable } from "../../core/context";
import { submissionInsert as query } from "../../queries/site.gen";
import type { NewSubmission } from "./types";

export async function insertSubmission(db: Pick<Queryable, "query">, s: NewSubmission): Promise<void> {
  await db.query(query, [s.id, s.form, s.name, s.email, s.message]);
}
