import type { Queryable } from "../../core/context";
import { previewUpsert as query } from "../../queries/posts.gen";
import type { NewPreview } from "./types";

export async function savePreview(db: Pick<Queryable, "query">, p: NewPreview): Promise<void> {
  await db.query(query, [p.hash, p.url, p.title, p.description, p.image, p.siteName, p.ok]);
}
