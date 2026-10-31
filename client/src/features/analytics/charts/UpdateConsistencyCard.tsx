import type { UpdateStatus } from '@batchops/shared';
import { UPDATE_STATUS_META } from '@/features/updates/meta';
import { cn } from '@/lib/cn';
import { dayjs } from '@/lib/day';
import { useUpdateConsistency, type AnalyticsParams } from '../api';
import { ChartCard } from './ChartCard';
import { STATUS_COLORS } from './theme';

const STATUS_COLOR: Record<UpdateStatus, string> = {
  'on-track': STATUS_COLORS.good,
  'at-risk': STATUS_COLORS.warning,
  blocked: STATUS_COLORS.critical,
};

/** Daily-update discipline: streaks, misses, the status mix, and one square per day. */
export function UpdateConsistencyCard({ params }: { params: AnalyticsParams }) {
  const query = useUpdateConsistency(params);
  const d = query.data;
  const total = d ? d.distribution.reduce((sum, s) => sum + s.count, 0) : 0;

  return (
    <ChartCard
      title="Daily update consistency"
      description="Vertical-wide — batch and instructor filters don't apply"
      isLoading={query.isPending}
      error={query.error}
      onRetry={() => query.refetch()}
      isEmpty={!d || d.totalDays === 0}
      height={180}
      table={
        d && {
          columns: ['Day', 'Status'],
          rows: d.days.map((day) => [dayjs(day.day).format('ddd D MMM'), day.status ? UPDATE_STATUS_META[day.status].label : 'Missed']),
        }
      }
    >
      {d && (
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-4 2xl:grid-cols-4">
            <Stat label="Current streak" value={`${d.currentStreak} day${d.currentStreak === 1 ? '' : 's'}`} />
            <Stat label="Longest in range" value={`${d.longestStreak} day${d.longestStreak === 1 ? '' : 's'}`} />
            <Stat label="Filed" value={`${d.filed} / ${d.totalDays}`} />
            <Stat label="Missed" value={d.missed} />
          </dl>

          <div>
            <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Status distribution">
              {d.distribution
                .filter((s) => s.count > 0)
                .map((s) => (
                  <div key={s.status} style={{ width: `${(s.count / total) * 100}%`, backgroundColor: STATUS_COLOR[s.status] }} />
                ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              {d.distribution.map((s) => {
                const Icon = UPDATE_STATUS_META[s.status].icon;
                return (
                  <li key={s.status} className="flex items-center gap-1.5">
                    <Icon className="size-3.5" style={{ color: STATUS_COLOR[s.status] }} aria-hidden />
                    {UPDATE_STATUS_META[s.status].label}
                    <span className="font-medium text-zinc-900 tabular-nums dark:text-zinc-100">{s.count}</span>
                  </li>
                );
              })}
              <li className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm border border-dashed border-zinc-300 dark:border-zinc-600" aria-hidden />
                Missed
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-1" aria-label="One square per day">
            {d.days.map((day) => (
              <span
                key={day.day}
                title={`${dayjs(day.day).format('ddd D MMM')}: ${day.status ? UPDATE_STATUS_META[day.status].label : 'No update'}`}
                className={cn('size-4 rounded-[3px]', !day.status && 'border border-dashed border-zinc-300 dark:border-zinc-600')}
                style={day.status ? { backgroundColor: STATUS_COLOR[day.status] } : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
