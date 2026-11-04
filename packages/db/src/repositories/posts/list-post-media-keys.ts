import type { Queryable } from "../../core/context";
import { postMediaKeys as query } from "../../queries/posts.gen";

/** Gönderinin ve altındaki yanıtların görselleri (silmeden önce depodan kaldırmak için). */
export function listPostMediaKeys(db: Pick<Queryable, "query">, id: string): Promise<{ key: string }[]> {
  return db.query<{ key: string }[]>(query, [id]);
}
