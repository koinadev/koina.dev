import type { Queryable } from "../../core/context";
import { notificationList as query } from "../../queries/notifications.gen";
import type { NotificationRow } from "./types";

export function listNotifications(db: Pick<Queryable, "query">, userId: string, before: Date, limit: number): Promise<NotificationRow[]> {
  return db.query<NotificationRow[]>(query, [userId, before, limit]);
}
