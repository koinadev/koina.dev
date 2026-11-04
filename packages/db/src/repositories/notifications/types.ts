export type NotificationKindRow = "reply" | "mention" | "quote" | "repost" | "clap" | "follow";

export interface NewNotification {
  id: string;
  userId: string;
  actorId: string;
  kind: NotificationKindRow;
  postId: string | null;
}

export interface NotificationRow {
  id: string;
  kind: NotificationKindRow;
  postId: string | null;
  createdAt: Date;
  readAt: Date | null;
  actorHandle: string;
  actorName: string;
  actorRoles: string[];
  postBody: string | null;
}
