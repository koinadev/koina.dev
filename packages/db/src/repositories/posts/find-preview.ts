import type { Queryable } from "../../core/context";
import { previewByHash as query } from "../../queries/posts.gen";
import type { LinkPreviewRow } from "../../tables/link_previews.gen";

export async function findPreview(db: Pick<Queryable, "query">, hash: string): Promise<LinkPreviewRow | null> {
  const [row] = await db.query<LinkPreviewRow[]>(query, [hash]);
  return row ?? null;
}
