import type { UserRow } from "../../tables/users.gen";
export type { MemberRole } from "../_lib/types";

/** `users` satırı; jsonb sütunlar dizi olarak gelir. */
export type MemberRow = Omit<UserRow, "roles" | "interests"> & { roles: string[]; interests: string[] };

export interface MemberUpdate {
  name: string;
  handle: string;
  bio: string;
  roles: string[];
  interests: string[];
  github: string | null;
  website: string | null;
  location: string | null;
}

export interface MemberStatsRow {
  posts: number;
  projects: number;
  claps: number;
  followers: number;
  following: number;
  followed: boolean;
}
