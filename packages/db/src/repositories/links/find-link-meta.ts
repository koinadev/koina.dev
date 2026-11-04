import type { Queryable } from "../../core/context";
import { linkMeta as query } from "../../queries/links.gen";
import type { LinkMetaRow } from "./types";

export async function findLinkMeta(db: Pick<Queryable, "query">, id: string): Promise<LinkMetaRow | null> {
  const [row] = await db.query<LinkMetaRow[]>(query, [id]);
  return row ?? null;
}
