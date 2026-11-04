import type { ContentStatus } from "../_lib/types";
export type { ContentStatus } from "../_lib/types";

export interface LinkRow {
  id: string;
  url: string;
  title: string;
  description: string;
  image: string | null;
  siteName: string;
  category: string;
  tags: string[];
  status: ContentStatus;
  createdAt: Date;
  userId: string;
  authorHandle: string;
  authorName: string;
  authorRoles: string[];
  votes: number;
  voted: boolean;
}

export interface LinkListFilter {
  before: Date;
  category?: string | null;
  search?: string | null;
  tag?: string | null;
  limit: number;
}

export interface LinkCursorRow {
  id: string;
  createdAt: Date;
}

export interface LinkCandidateRow {
  id: string;
  createdAt: Date;
  userId: string;
  votes: number;
  reports: number;
}

export interface LinkMetaRow {
  id: string;
  userId: string;
  status: ContentStatus;
}

export interface NewLink {
  id: string;
  userId: string;
  url: string;
  urlHash: string;
  title: string;
  description: string;
  image: string | null;
  siteName: string;
  category: string;
  tags: string[];
}
