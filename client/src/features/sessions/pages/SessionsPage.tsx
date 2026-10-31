import { CalendarClock, CalendarX2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { MiniCalendar } from '@/components/MiniCalendar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { useAuthUser } from '@/features/auth/api';
import { useUserOptions } from '@/features/users/api';
import { DAY_REGEX } from '@batchops/shared';
import { dayjs, shiftDay, todayIST } from '@/lib/day';
import { useUrlFilters } from '@/lib/useUrlFilters';
import { useBatchOptions, useSessionCalendar, useSessions } from '../api';
import { SessionItem, SessionItemSkeleton } from '../components/SessionItem';
import { formatDuration } from '../meta';
import { canLogSessions } from '../permissions';
import { useSessionActions } from '../useSessionActions';

const FILTER_KEYS = ['day', 'batch', 'instructor'] as const;

export function SessionsPage() {
  const user = useAuthUser();
  const today = todayIST();
  const [filters, setFilters] = useUrlFilters(FILTER_KEYS);
  const day = DAY_REGEX.test(filters.day) ? filters.day : today;
  const [month, setMonth] = useState(day.slice(0, 7));
  useEffect(() => setMonth(day.slice(0, 7)), [day]);

  const scope = { batch: filters.batch, instructor: filters.instructor };
  const sessions = useSessions({ day, ...scope });
  const calendar = useSessionCalendar(month, scope);
  const batchOptions = useBatchOptions();
  const instructorOptions = useUserOptions();
  const actions = useSessionActions();

  const counts = useMemo(() => Object.fromEntries((calendar.data ?? []).map((d) => [d.day, d.count])), [calendar.data]);
  const items = sessions.data?.items ?? [];
  const completed = items.filter((s) => s.status === 'completed');
  const minutes = completed.reduce((sum, s) => sum + s.durationMinutes, 0);
  const canLog = canLogSessions(user) && day <= today;
  const setDay = (next: string) => setFilters({ day: next === today ? '' : next });

  return (
    <>
      <PageHeader
        title="Sessions"
        description={user.role === 'instructor' ? 'Sessions in the batches you teach, day by day.' : 'Every session across batches, day by day.'}
        actions={
          canLogSessions(user) && (
            <Button onClick={() => actions.log({ day })}>
              <Plus className="size-4" /> Log session
            </Button>
          )
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[18rem_1fr]">
        <div className="space-y-4 lg:sticky lg:top-20">
          <Card>
            <CardContent className="p-4">
              <MiniCalendar
                month={month}
                onMonthChange={setMonth}
                selectedDay={day}
                onSelectDay={setDay}
                today={today}
                counts={counts}
              />
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <Select
              value={filters.batch}
              onChange={(e) => setFilters({ batch: e.target.value })}
              aria-label="Filter by batch"
            >
              <option value="">All batches</option>
              {batchOptions.data?.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.code}
                </option>
              ))}
            </Select>
            {user.role !== 'instructor' && (
              <Select
                value={filters.instructor}
                onChange={(e) => setFilters({ instructor: e.target.value })}
                aria-label="Filter by instructor"
              >
                <option value="">All instructors</option>
                {instructorOptions.data?.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">{dayjs(day).format('dddd, D MMMM YYYY')}</h2>
              {day === today && <Badge tone="accent">Today</Badge>}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="icon-sm" aria-label="Previous day" onClick={() => setDay(shiftDay(day, -1))}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="secondary" size="sm" disabled={day === today} onClick={() => setDay(today)}>
                Today
              </Button>
              <Button variant="secondary" size="icon-sm" aria-label="Next day" onClick={() => setDay(shiftDay(day, 1))}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {!sessions.isPending && !sessions.isError && items.length > 0 && (
            <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
              {items.length} session{items.length > 1 ? 's' : ''}
              {completed.length > 0 && ` · ${formatDuration(minutes)} taught`}
              {items.length > completed.length && ` · ${items.length - completed.length} not held`}
            </p>
          )}

          <Card>
            {sessions.isPending ? (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {Array.from({ length: 3 }, (_, i) => (
                  <SessionItemSkeleton key={i} />
                ))}
              </ul>
            ) : sessions.isError ? (
              <ErrorState title="Couldn't load sessions" error={sessions.error} onRetry={() => sessions.refetch()} />
            ) : items.length === 0 ? (
              <EmptyState
                icon={day > today ? CalendarX2 : CalendarClock}
                title={day > today ? 'This day is in the future' : 'No sessions on this day'}
                description={
                  day > today
                    ? 'Sessions are logged once they happen.'
                    : filters.batch || filters.instructor
                      ? 'Nothing matches the selected filters.'
                      : canLog
                        ? 'Log what was taught so progress and analytics stay current.'
                        : undefined
                }
                action={canLog && <Button onClick={() => actions.log({ day })}>Log a session</Button>}
              />
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {items.map((s) => (
                  <SessionItem key={s._id} session={s} onEdit={actions.edit} onDelete={actions.remove} />
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {actions.dialogs}
    </>
  );
}
