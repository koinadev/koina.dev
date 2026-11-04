import type { Queryable } from "../../core/context";
import { notificationUnread as query } from "../../queries/notifications.gen";

export async function countUnread(db: Pick<Queryable, "query">, userId: string): Promise<number> {
  const [row] = await db.query<{ unread: number }[]>(query, [userId]);
  return row?.unread ?? 0;
}
