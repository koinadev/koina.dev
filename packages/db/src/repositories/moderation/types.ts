import type { ModTarget } from "../_lib/types";
export type { ModTarget } from "../_lib/types";

export interface NewReport {
  id: string;
  reporterId: string;
  targetKind: ModTarget;
  targetId: string;
  reason: string;
  note: string;
}

export interface ReportTallyRow {
  reporters: number;
  trusted: number;
}

export interface ReportQueueRow {
  targetKind: ModTarget;
  targetId: string;
  reports: number;
  firstAt: Date;
  lastAt: Date;
  reasons: string[];
}

export interface NewModerationLog {
  id: string;
  actorId: string | null;
  targetKind: ModTarget;
  targetId: string;
  action: string;
  reason: string;
}

export interface ModerationLogEntry {
  id: string;
  targetKind: ModTarget;
  targetId: string;
  action: string;
  reason: string;
  createdAt: Date;
  actorHandle: string | null;
}
