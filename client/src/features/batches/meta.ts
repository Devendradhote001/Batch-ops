import type { BatchSchedule, BatchStatus } from '@batchops/shared';
import type { BadgeTone } from '@/components/ui/Badge';
import { dayjs } from '@/lib/day';

export const BATCH_STATUS_META: Record<BatchStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  upcoming: { label: 'Upcoming', tone: 'accent' },
  paused: { label: 'Paused', tone: 'warning' },
  completed: { label: 'Completed', tone: 'neutral' },
};

/** Monday-first week, as the vertical plans it. Values are JS day numbers (0 = Sunday). */
export const WEEKDAYS = [
  { value: 1, short: 'Mon' },
  { value: 2, short: 'Tue' },
  { value: 3, short: 'Wed' },
  { value: 4, short: 'Thu' },
  { value: 5, short: 'Fri' },
  { value: 6, short: 'Sat' },
  { value: 0, short: 'Sun' },
] as const;

export function formatTime(hhmm: string) {
  return dayjs(`2000-01-01T${hhmm}`).format('h:mm A');
}

export function formatScheduleDays(days: number[]) {
  if (days.length === 7) return 'Every day';
  return WEEKDAYS.filter((d) => days.includes(d.value))
    .map((d) => d.short)
    .join(', ');
}

export function formatSchedule(schedule: BatchSchedule) {
  return `${formatScheduleDays(schedule.days)} · ${formatTime(schedule.startTime)}–${formatTime(schedule.endTime)}`;
}

export function formatDay(day: string, format = 'D MMM YYYY') {
  return dayjs(day).format(format);
}

export function formatDayRange(start: string, end: string) {
  const s = dayjs(start);
  const e = dayjs(end);
  return s.year() === e.year() ? `${s.format('D MMM')} – ${e.format('D MMM YYYY')}` : `${s.format('D MMM YYYY')} – ${e.format('D MMM YYYY')}`;
}
