import type { BatchOption, PublicUser, Session, UserSummary } from '@batchops/shared';

/** Mirrors the API rules so the UI only offers actions that will succeed. */
export function canLogSessions(user: PublicUser) {
  return user.role === 'admin' || user.role === 'instructor';
}

export function canLogToBatch(user: PublicUser, batch: { instructors: UserSummary[] } | BatchOption) {
  return user.role === 'admin' || (user.role === 'instructor' && batch.instructors.some((u) => u._id === user._id));
}

export function canEditSession(user: PublicUser, session: Session) {
  return user.role === 'admin' || (user.role === 'instructor' && session.instructor._id === user._id);
}
