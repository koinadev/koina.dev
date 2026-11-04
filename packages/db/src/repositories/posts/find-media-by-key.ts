import type { Queryable } from "../../core/context";
import { mediaByKey as query } from "../../queries/posts.gen";
import type { MediaLookupRow } from "./types";

export async function findMediaByKey(db: Pick<Queryable, "query">, key: string): Promise<MediaLookupRow | null> {
  const [row] = await db.query<MediaLookupRow[]>(query, [key]);
  return row ?? null;
}
