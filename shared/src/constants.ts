/** All "day" logic in the app is anchored to this timezone. */
export const APP_TIMEZONE = 'Asia/Kolkata';

/** A calendar day in APP_TIMEZONE, formatted YYYY-MM-DD. */
export const DAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const ROLES = ['admin', 'instructor', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  instructor: 'Instructor',
  viewer: 'Viewer',
};

export const BATCH_STATUSES = ['upcoming', 'active', 'completed', 'paused'] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const SESSION_TYPES = ['lecture', 'lab', 'doubt', 'test', 'project-review'] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const SESSION_STATUSES = ['completed', 'cancelled', 'rescheduled'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const UPDATE_STATUSES = ['on-track', 'at-risk', 'blocked'] as const;
export type UpdateStatus = (typeof UPDATE_STATUSES)[number];

export const EVENT_TYPES = [
  'workshop',
  'hackathon',
  'webinar',
  'guest-talk',
  'assessment',
  'other',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_STATUSES = ['planned', 'completed', 'cancelled'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const AVATAR_COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
] as const;
