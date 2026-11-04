import type { Queryable } from "../../core/context";
import { linkInsert as query } from "../../queries/links.gen";
import type { NewLink } from "./types";

export async function insertLink(db: Pick<Queryable, "query">, l: NewLink): Promise<void> {
  await db.query(query, [l.id, l.userId, l.url, l.urlHash, l.title, l.description, l.image, l.siteName, l.category, JSON.stringify(l.tags)]);
}
