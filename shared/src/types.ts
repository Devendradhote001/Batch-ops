import type { BatchStatus, Role, SessionStatus, SessionType } from './constants';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PublicUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A user as embedded in other records (batch instructors, session instructor…). */
export interface UserSummary {
  _id: string;
  name: string;
  avatarColor: string;
  role: Role;
  isActive?: boolean;
  email?: string;
}

export interface BatchSchedule {
  /** 0 = Sunday … 6 = Saturday */
  days: number[];
  /** HH:mm, IST */
  startTime: string;
  endTime: string;
}

export interface BatchModule {
  _id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string | null;
}

export interface BatchStats {
  sessionsCompleted: number;
  /** completed sessions ÷ totalPlannedSessions, 0–100 */
  progress: number;
  modulesCompleted: number;
  modulesTotal: number;
}

export interface Batch {
  _id: string;
  name: string;
  code: string;
  description: string;
  /** YYYY-MM-DD (IST calendar day) */
  startDate: string;
  endDate: string;
  status: BatchStatus;
  leadInstructor: UserSummary;
  instructors: UserSummary[];
  studentCount: number;
  schedule: BatchSchedule;
  totalPlannedSessions: number;
  modules: BatchModule[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  stats: BatchStats;
}

/** Lightweight batch for pickers: just what the session form needs. */
export interface BatchOption {
  _id: string;
  name: string;
  code: string;
  status: BatchStatus;
  studentCount: number;
  instructors: UserSummary[];
  modules: { _id: string; title: string }[];
}

export interface Session {
  _id: string;
  batch: { _id: string; name: string; code: string; studentCount: number };
  /** YYYY-MM-DD (IST calendar day) */
  day: string;
  title: string;
  topic: string;
  instructor: UserSummary;
  type: SessionType;
  durationMinutes: number;
  attendanceCount: number;
  status: SessionStatus;
  notes: string;
  recordingLink: string;
  createdBy: { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface SessionCalendarDay {
  day: string;
  count: number;
  completed: number;
  minutes: number;
}
