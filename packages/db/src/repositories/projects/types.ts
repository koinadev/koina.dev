export type { MemberRefRow } from "../_lib/types";

export interface ProjectRow {
  id: string;
  slug: string;
  name: string;
  summary: string;
  status: "idea" | "building" | "shipped";
  repoUrl: string | null;
  lookingFor: string[];
  createdAt: Date;
  ownerHandle: string;
  ownerName: string;
  ownerRoles: string[];
  members: number;
  posts: number;
  me: boolean;
}

export interface ProjectDetailRow extends ProjectRow {
  ownerId: string;
}

export interface ProjectListFilter {
  before: Date;
  status?: string | null;
  role?: string | null;
  search?: string | null;
  member?: string | null;
  limit: number;
}

export interface NewProject {
  id: string;
  slug: string;
  name: string;
  summary: string;
  repoUrl: string | null;
  lookingFor: string[];
  ownerId: string;
}
