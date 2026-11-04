import type { Queryable } from "../../core/context";
import { linkSetStatus as query } from "../../queries/links.gen";
import type { ContentStatus } from "./types";

export async function setLinkStatus(db: Pick<Queryable, "query">, id: string, status: ContentStatus): Promise<boolean> {
  return (await db.query(query, [id, status])).length > 0;
}
