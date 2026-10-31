import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { EventType, SessionStatus, UpdateStatus } from '@batchops/shared';
import { api, unwrap } from '@/lib/api';
import { compactParams } from '@/lib/useUrlFilters';

export interface AnalyticsParams {
  from: string;
  to: string;
  batch?: string;
  instructor?: string;
}

export interface Series {
  key: string;
  label: string;
  name?: string;
}

type Row<K extends string> = Record<K, string> & Record<string, number | string | null>;

export interface Kpis {
  activeBatches: number;
  sessions: number;
  teachingHours: number;
  avgAttendance: number | null;
  eventsConducted: number;
  updateStreak: number | null;
}

export interface BatchProgressItem {
  batchId: string;
  code: string;
  name: string;
  completed: number;
  planned: number;
  progress: number;
}

export interface WeeklySeries {
  series: Series[];
  rows: Row<'week'>[];
}

export interface Workload {
  series: Series[];
  sessions: Row<'week'>[];
  hours: Row<'week'>[];
}

export interface EventsBreakdown {
  types: EventType[];
  byMonth: Row<'month'>[];
  byPerson: { userId: string; name: string; led: number; coLed: number }[];
}

export interface UpdateConsistency {
  days: { day: string; status: UpdateStatus | null }[];
  filed: number;
  missed: number;
  totalDays: number;
  currentStreak: number;
  longestStreak: number;
  distribution: { status: UpdateStatus; count: number }[];
}

/** One hook per endpoint so each chart loads (and fails) on its own. */
function useAnalytics<T>(endpoint: string, params: AnalyticsParams) {
  return useQuery({
    queryKey: ['analytics', endpoint, params],
    queryFn: () => unwrap<T>(api.get(`/analytics/${endpoint}`, { params: compactParams({ ...params }) })),
    placeholderData: keepPreviousData,
  });
}

export const useKpis = (p: AnalyticsParams) => useAnalytics<Kpis>('kpis', p);
export const useBatchProgress = (p: AnalyticsParams) => useAnalytics<BatchProgressItem[]>('batch-progress', p);
export const useSessionsOverTime = (p: AnalyticsParams) => useAnalytics<WeeklySeries>('sessions-over-time', p);
export const useAttendanceTrend = (p: AnalyticsParams) => useAnalytics<WeeklySeries>('attendance-trend', p);
export const useWorkload = (p: AnalyticsParams) => useAnalytics<Workload>('instructor-workload', p);
export const useSessionStatus = (p: AnalyticsParams) => useAnalytics<{ status: SessionStatus; count: number }[]>('session-status', p);
export const useEventsBreakdown = (p: AnalyticsParams) => useAnalytics<EventsBreakdown>('events', p);
/** Admin and viewer only — don't render it for instructors. */
export const useUpdateConsistency = (p: AnalyticsParams) => useAnalytics<UpdateConsistency>('update-consistency', p);
