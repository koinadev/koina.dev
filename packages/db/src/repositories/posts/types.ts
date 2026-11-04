import type { ContentStatus } from "../_lib/types";
export type { ContentStatus } from "../_lib/types";

/** jsonb olarak gelen görsel. */
export interface MediaJson {
  id: string;
  key: string;
  width: number;
  height: number;
  alt: string;
}

export interface PreviewJson {
  url: string;
  title: string;
  description: string;
  image: string | null;
  siteName: string;
}

/** Alıntılanan gönderi (jsonb: tarih metin olarak gelir). */
export interface QuoteJson {
  id: string;
  body: string;
  createdAt: string;
  status: ContentStatus;
  handle: string;
  name: string;
  roles: string[];
  media: MediaJson[] | null;
}

export interface PostRow {
  id: string;
  body: string;
  createdAt: Date;
  parentId: string | null;
  rootId: string | null;
  status: ContentStatus;
  userId: string;
  linkUrl: string | null;
  authorHandle: string;
  authorName: string;
  authorRoles: string[];
  projectSlug: string | null;
  projectName: string | null;
  parentHandle: string | null;
  claps: number;
  replies: number;
  reposts: number;
  quotes: number;
  clapped: boolean;
  reposted: boolean;
  bookmarked: boolean;
  media: MediaJson[] | null;
  preview: PreviewJson | null;
  quote: QuoteJson | null;
}

export interface LatestPostFilter {
  before: Date;
  tag?: string | null;
  project?: string | null;
  author?: string | null;
  onlyProjects?: boolean;
  /** Sadeleştirilmiş (küçük harf, Türkçe harfler indirgenmiş) arama metni. */
  search?: string | null;
  limit: number;
}

export interface PostCursorRow {
  id: string;
  createdAt: Date;
}

export interface FollowingPostRow {
  id: string;
  sortAt: Date;
  repostHandle: string | null;
  repostName: string | null;
}

/** Öne çıkanlar puanlamasının girdisi; sayılar yazarın kendi etkileşimini içermez. */
export interface FeedCandidateRow {
  id: string;
  userId: string;
  createdAt: Date;
  inProject: boolean;
  rich: boolean;
  authorTrust: number;
  claps: number;
  repliers: number;
  reposts: number;
  quotes: number;
  bookmarks: number;
  reports: number;
  followed: boolean;
  myProject: boolean;
}

export interface PostMetaRow {
  id: string;
  userId: string;
  parentId: string | null;
  rootId: string | null;
  projectId: string | null;
  status: ContentStatus;
}

export interface NewPost {
  id: string;
  userId: string;
  projectId: string | null;
  parentId: string | null;
  rootId: string | null;
  quoteId: string | null;
  body: string;
  linkUrl: string | null;
  linkHash: string | null;
}

export interface TrendRow {
  tag: string;
  people: number;
  posts: number;
}

export interface NewMedia {
  id: string;
  userId: string;
  key: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
  alt: string;
}

export interface MediaLookupRow {
  key: string;
  mime: string;
  postId: string | null;
  status: ContentStatus | null;
}

export interface NewPreview {
  hash: string;
  url: string;
  title: string;
  description: string;
  image: string | null;
  siteName: string;
  ok: boolean;
}
