import { CircleHelp, ClipboardCheck, FlaskConical, GitPullRequest, Presentation, type LucideIcon } from 'lucide-react';
import type { SessionStatus, SessionType } from '@batchops/shared';
import type { BadgeTone } from '@/components/ui/Badge';

export const SESSION_TYPE_META: Record<SessionType, { label: string; icon: LucideIcon }> = {
  lecture: { label: 'Lecture', icon: Presentation },
  lab: { label: 'Lab', icon: FlaskConical },
  doubt: { label: 'Doubt session', icon: CircleHelp },
  test: { label: 'Test', icon: ClipboardCheck },
  'project-review': { label: 'Project review', icon: GitPullRequest },
};

export const SESSION_STATUS_META: Record<SessionStatus, { label: string; tone: BadgeTone }> = {
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  rescheduled: { label: 'Rescheduled', tone: 'warning' },
};

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
