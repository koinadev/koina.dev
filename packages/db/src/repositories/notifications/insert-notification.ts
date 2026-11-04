import type { Queryable } from "../../core/context";
import { notificationInsert as query } from "../../queries/notifications.gen";
import type { NewNotification } from "./types";

/** Aynı kişi aynı içerik için aynı türde ikinci bildirimi üretmez. */
export async function insertNotification(db: Pick<Queryable, "query">, n: NewNotification): Promise<void> {
  await db.query(query, [n.id, n.userId, n.actorId, n.kind, n.postId]);
}
