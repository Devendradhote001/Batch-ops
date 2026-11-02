import { useQuery } from '@tanstack/react-query';
import type { Batch, DailyUpdate, Session, UpdateStatus, VerticalEvent } from '@batchops/shared';
import { api, unwrap } from '@/lib/api';

export interface ActivityItem {
  _id: string;
  actor: { _id: string; name: string; avatarColor: string } | null;
  action: string;
  entity: 'user' | 'batch' | 'session' | 'update' | 'event';
  entityId: string;
  summary: string;
  createdAt: string;
}

export interface Dashboard {
  today: string;
  sessionsToday: Session[];
  activeBatches: { total: number; items: Batch[] };
  upcomingEvents: { total: number; items: VerticalEvent[] };
  /** null for instructors, who don't see daily updates. */
  todaysUpdate: { filed: boolean; status: UpdateStatus | null } | null;
  recentUpdates: DailyUpdate[] | null;
  recentActivity: ActivityItem[] | null;
  /** Admin only: users waiting for a password reset. */
  passwordResetRequests: number | null;
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => unwrap<Dashboard>(api.get('/dashboard')),
    // The manager leaves this open; keep "today" current without a reload.
    refetchInterval: 60_000,
  });
}
