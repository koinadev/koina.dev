/** Birden çok repository'nin paylaştığı satır parçaları. */
export type ContentStatus = "visible" | "hidden" | "removed";
export type MemberRole = "member" | "moderator" | "admin";
export type ModTarget = "post" | "link" | "user";

/** Gönderi, proje ve ekip satırlarındaki kısa künye. */
export interface MemberRefRow {
  handle: string;
  name: string;
  roles: string[];
}
