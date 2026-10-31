import { useMemo } from 'react';
import { useBatchOptions } from '@/features/sessions/api';
import { useUserOptions } from '@/features/users/api';
import { dayjs } from '@/lib/day';

export const SERIES_SLOTS = 8;

export const seriesColor = (slot: number) => `var(--series-${(slot % SERIES_SLOTS) + 1})`;

export const STATUS_COLORS = {
  good: 'var(--status-good)',
  warning: 'var(--status-warning)',
  critical: 'var(--status-critical)',
} as const;

/** Shared axis/grid styling: recessive chrome, muted ticks. */
export const axisProps = {
  stroke: 'var(--chart-axis)',
  tick: { fill: 'var(--chart-tick)', fontSize: 12 },
  tickLine: false,
} as const;

export const gridProps = { stroke: 'var(--chart-grid)', strokeDasharray: '0', vertical: false } as const;

export const formatWeek = (week: string) => dayjs(week).format('D MMM');
export const formatMonth = (month: string) => dayjs(`${month}-01`).format('MMM YYYY');

function hashSlot(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % SERIES_SLOTS;
}

/**
 * Stable colours per entity: a batch or person keeps its colour whatever the filters, because the slot
 * comes from its position in the full (unfiltered) option list — colour follows the entity, not its rank.
 */
export function useEntityColors() {
  const batches = useBatchOptions();
  const people = useUserOptions();

  return useMemo(() => {
    const slots = new Map<string, number>();
    [...(batches.data ?? [])].sort((a, b) => a.code.localeCompare(b.code)).forEach((b, i) => slots.set(b._id, i));
    [...(people.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)).forEach((u, i) => slots.set(u._id, i));
    return (id: string) => seriesColor(slots.get(id) ?? hashSlot(id));
  }, [batches.data, people.data]);
}
