import type { Queryable } from "../../core/context";
import { submissionList as query } from "../../queries/site.gen";
import type { SubmissionRow } from "../../tables/submissions.gen";

export function listSubmissions(db: Pick<Queryable, "query">, form: string | null): Promise<SubmissionRow[]> {
  return db.query<SubmissionRow[]>(query, [form]);
}
