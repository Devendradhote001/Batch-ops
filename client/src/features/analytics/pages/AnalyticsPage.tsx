import { CalendarCheck, CalendarClock, Clock, Flame, Layers, Users } from 'lucide-react';
import { DAY_REGEX } from '@batchops/shared';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { useAuthUser } from '@/features/auth/api';
import { useBatchOptions } from '@/features/sessions/api';
import { useUserOptions } from '@/features/users/api';
import { cn } from '@/lib/cn';
import { dayjs, shiftDay, todayIST } from '@/lib/day';
import { useUrlFilters } from '@/lib/useUrlFilters';
import { useAttendanceTrend, useKpis, useSessionsOverTime, type AnalyticsParams } from '../api';
import { BatchProgressChart } from '../charts/BatchProgressChart';
import { EventsByMonthChart, EventsLedChart } from '../charts/EventsCharts';
import { SessionStatusChart } from '../charts/SessionStatusChart';
import { UpdateConsistencyCard } from '../charts/UpdateConsistencyCard';
import { WeeklyLineChart } from '../charts/WeeklyLineChart';
import { WorkloadChart } from '../charts/WorkloadChart';

const FILTER_KEYS = ['range', 'from', 'to', 'batch', 'instructor'] as const;
const PRESETS = [
  { value: '7d', label: '7 days', days: 7 },
  { value: '30d', label: '30 days', days: 30 },
  { value: '90d', label: '90 days', days: 90 },
] as const;

export function AnalyticsPage() {
  const user = useAuthUser();
  const isInstructor = user.role === 'instructor';
  const today = todayIST();
  const [filters, setFilters] = useUrlFilters(FILTER_KEYS);
  const batches = useBatchOptions();
  const people = useUserOptions();

  const range = filters.range === 'custom' ? 'custom' : (PRESETS.find((p) => p.value === filters.range)?.value ?? '30d');
  const preset = PRESETS.find((p) => p.value === range);
  const customFrom = DAY_REGEX.test(filters.from) ? filters.from : shiftDay(today, -29);
  const customTo = DAY_REGEX.test(filters.to) ? filters.to : today;
  const params: AnalyticsParams = {
    from: preset ? shiftDay(today, -(preset.days - 1)) : customFrom,
    to: preset ? today : customTo,
    batch: filters.batch || undefined,
    instructor: isInstructor ? undefined : filters.instructor || undefined,
  };

  const kpis = useKpis(params);
  const sessionsOverTime = useSessionsOverTime(params);
  const attendance = useAttendanceTrend(params);
  const k = kpis.data;

  return (
    <>
      <PageHeader
        title="Analytics"
        description={
          isInstructor
            ? 'Your own teaching numbers.'
            : `${dayjs(params.from).format('D MMM')} – ${dayjs(params.to).format('D MMM YYYY')} across the vertical.`
        }
      />

      {/* Filters: one row above all charts. */}
      <div className="mb-6 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800" role="group" aria-label="Date range">
          {[...PRESETS, { value: 'custom', label: 'Custom' } as const].map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={range === p.value}
              onClick={() =>
                setFilters(
                  p.value === 'custom'
                    ? { range: 'custom', from: params.from, to: params.to }
                    : { range: p.value === '30d' ? '' : p.value, from: '', to: '' },
                )
              }
              className={cn(
                'h-8 flex-1 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors lg:flex-none',
                range === p.value
                  ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {range === 'custom' && (
          <div className="grid grid-cols-2 gap-2 lg:flex">
            <Input type="date" aria-label="From" value={customFrom} max={customTo} onChange={(e) => e.target.value && setFilters({ from: e.target.value })} className="lg:w-40" />
            <Input type="date" aria-label="To" value={customTo} min={customFrom} max={today} onChange={(e) => e.target.value && setFilters({ to: e.target.value })} className="lg:w-40" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 lg:ml-auto lg:flex">
          <Select value={filters.batch} onChange={(e) => setFilters({ batch: e.target.value })} aria-label="Filter by batch" wrapperClassName={cn('lg:w-44', isInstructor && 'col-span-2')}>
            <option value="">All batches</option>
            {batches.data?.map((b) => (
              <option key={b._id} value={b._id}>
                {b.code}
              </option>
            ))}
          </Select>
          {!isInstructor && (
            <Select value={filters.instructor} onChange={(e) => setFilters({ instructor: e.target.value })} aria-label="Filter by instructor" wrapperClassName="lg:w-48">
              <option value="">All instructors</option>
              {people.data?.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

      <div className={cn('grid grid-cols-2 gap-3 md:grid-cols-3', isInstructor ? 'xl:grid-cols-5' : 'xl:grid-cols-6')}>
        <StatCard label="Active batches" icon={Layers} loading={kpis.isPending} value={k?.activeBatches ?? '—'} />
        <StatCard label="Sessions held" icon={CalendarClock} loading={kpis.isPending} value={k?.sessions ?? '—'} hint="in range" />
        <StatCard label="Teaching hours" icon={Clock} loading={kpis.isPending} value={k ? `${k.teachingHours}h` : '—'} hint="in range" />
        <StatCard
          label="Avg attendance"
          icon={Users}
          loading={kpis.isPending}
          value={k?.avgAttendance == null ? '—' : `${k.avgAttendance}%`}
          hint="of enrolled students"
        />
        <StatCard label="Events conducted" icon={CalendarCheck} loading={kpis.isPending} value={k?.eventsConducted ?? '—'} hint="in range" />
        {!isInstructor && (
          <StatCard
            label="Update streak"
            icon={Flame}
            loading={kpis.isPending}
            value={k?.updateStreak == null ? '—' : `${k.updateStreak}d`}
            hint="consecutive days filed"
          />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <BatchProgressChart params={params} />
        <SessionStatusChart params={params} />
        <WeeklyLineChart title="Sessions over time" description="Completed sessions per week, by batch" query={sessionsOverTime} />
        <WeeklyLineChart
          title="Attendance trend"
          description="Average weekly attendance, by batch"
          query={attendance}
          unit="%"
          yDomain={[(min: number) => Math.max(0, Math.floor((min - 10) / 10) * 10), 100]}
        />
        <WorkloadChart params={params} />
        <EventsByMonthChart params={params} />
        <EventsLedChart params={params} />
        {!isInstructor && <UpdateConsistencyCard params={params} />}
      </div>
    </>
  );
}
