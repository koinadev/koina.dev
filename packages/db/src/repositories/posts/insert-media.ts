import type { Queryable } from "../../core/context";
import { mediaInsert as query } from "../../queries/posts.gen";
import type { NewMedia } from "./types";

export async function insertMedia(db: Pick<Queryable, "query">, m: NewMedia): Promise<void> {
  await db.query(query, [m.id, m.userId, m.key, m.mime, m.bytes, m.width, m.height, m.alt]);
}
