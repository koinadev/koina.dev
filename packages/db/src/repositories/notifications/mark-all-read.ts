import type { Queryable } from "../../core/context";
import { notificationReadAll as query } from "../../queries/notifications.gen";

export async function markAllRead(db: Pick<Queryable, "query">, userId: string): Promise<void> {
  await db.query(query, [userId]);
}
