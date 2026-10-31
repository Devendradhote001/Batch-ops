import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { DAY_REGEX, EVENT_STATUSES, EVENT_TYPES } from '@batchops/shared';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthUser } from '@/features/auth/api';
import { cn } from '@/lib/cn';
import { dayjs, shiftDay, todayIST } from '@/lib/day';
import { useUrlFilters } from '@/lib/useUrlFilters';
import { useEvents, useInfiniteEvents } from '../api';
import { EventListItem, EventListItemSkeleton } from '../components/EventListItem';
import { MonthGrid } from '../components/MonthGrid';
import { EVENT_STATUS_META, EVENT_TYPE_META } from '../meta';
import { useEventActions } from '../useEventActions';

const FILTER_KEYS = ['view', 'month', 'day', 'type', 'status'] as const;

export function EventsPage() {
  const user = useAuthUser();
  const isAdmin = user.role === 'admin';
  const today = todayIST();
  const [filters, setFilters] = useUrlFilters(FILTER_KEYS);
  const actions = useEventActions();
  const view = filters.view === 'list' ? 'list' : 'month';
  const kind = { type: filters.type, status: filters.status };

  return (
    <>
      <PageHeader
        title="Events"
        description={isAdmin || user.role === 'viewer' ? 'Workshops, hackathons, talks and assessments.' : 'Events you lead or co-lead.'}
        actions={
          <>
            <div className="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800" role="tablist" aria-label="View">
              <ViewTab active={view === 'month'} onClick={() => setFilters({ view: '' })} icon={<CalendarDays className="size-4" />}>
                Calendar
              </ViewTab>
              <ViewTab active={view === 'list'} onClick={() => setFilters({ view: 'list' })} icon={<List className="size-4" />}>
                List
              </ViewTab>
            </div>
            {isAdmin && (
              <Button onClick={() => actions.create()}>
                <Plus className="size-4" /> New event
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex">
        <Select value={filters.type} onChange={(e) => setFilters({ type: e.target.value })} aria-label="Filter by type" wrapperClassName="sm:w-44">
          <option value="">All types</option>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {EVENT_TYPE_META[t].label}
            </option>
          ))}
        </Select>
        <Select value={filters.status} onChange={(e) => setFilters({ status: e.target.value })} aria-label="Filter by status" wrapperClassName="sm:w-40">
          <option value="">Any status</option>
          {EVENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {EVENT_STATUS_META[s].label}
            </option>
          ))}
        </Select>
      </div>

      {view === 'month' ? (
        <MonthView
          month={/^\d{4}-\d{2}$/.test(filters.month) ? filters.month : today.slice(0, 7)}
          day={DAY_REGEX.test(filters.day) ? filters.day : today}
          kind={kind}
          today={today}
          isAdmin={isAdmin}
          onChange={setFilters}
          actions={actions}
        />
      ) : (
        <ListView kind={kind} today={today} isAdmin={isAdmin} actions={actions} />
      )}

      {actions.dialogs}
    </>
  );
}

function ViewTab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
        active ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

type Actions = ReturnType<typeof useEventActions>;

interface MonthViewProps {
  month: string;
  day: string;
  kind: { type: string; status: string };
  today: string;
  isAdmin: boolean;
  onChange: (patch: Partial<Record<(typeof FILTER_KEYS)[number], string>>) => void;
  actions: Actions;
}

function MonthView({ month, day, kind, today, isAdmin, onChange, actions }: MonthViewProps) {
  const start = dayjs(`${month}-01`);
  const events = useEvents({ from: `${month}-01`, to: start.endOf('month').format('YYYY-MM-DD'), ...kind });
  const goToMonth = (m: string) => onChange({ month: m === today.slice(0, 7) ? '' : m, day: m === today.slice(0, 7) ? '' : `${m}-01` });
  const selectedDay = day.startsWith(month) ? day : `${month}-01`;
  const dayEvents = (events.data?.items ?? []).filter((e) => e.day === selectedDay);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{start.format('MMMM YYYY')}</h2>
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="icon-sm" aria-label="Previous month" onClick={() => goToMonth(start.subtract(1, 'month').format('YYYY-MM'))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="secondary" size="sm" disabled={month === today.slice(0, 7)} onClick={() => onChange({ month: '', day: '' })}>
            Today
          </Button>
          <Button variant="secondary" size="icon-sm" aria-label="Next month" onClick={() => goToMonth(start.add(1, 'month').format('YYYY-MM'))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {events.isError ? (
        <Card>
          <ErrorState title="Couldn't load events" error={events.error} onRetry={() => events.refetch()} />
        </Card>
      ) : events.isPending ? (
        <Skeleton className="h-[36rem] rounded-lg" />
      ) : (
        <MonthGrid
          month={month}
          events={events.data.items}
          selectedDay={selectedDay}
          today={today}
          onSelectDay={(d) => onChange({ day: d === today ? '' : d, month: d.slice(0, 7) === today.slice(0, 7) ? '' : d.slice(0, 7) })}
          onOpenEvent={actions.open}
        />
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>
            {selectedDay === today ? 'Today' : dayjs(selectedDay).format('dddd')}
            <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">{dayjs(selectedDay).format('D MMMM')}</span>
          </CardTitle>
          {isAdmin && (
            <Button variant="secondary" size="sm" onClick={() => actions.create(selectedDay)}>
              <CalendarPlus className="size-3.5" /> Add event
            </Button>
          )}
        </CardHeader>
        {events.isPending ? (
          <ul>
            <EventListItemSkeleton />
          </ul>
        ) : dayEvents.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No events on this day.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {dayEvents.map((e) => (
              <EventListItem key={e._id} event={e} onOpen={actions.open} hideDate />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ListView({ kind, today, isAdmin, actions }: { kind: { type: string; status: string }; today: string; isAdmin: boolean; actions: Actions }) {
  const upcoming = useEvents({ from: today, sort: 'asc', ...kind });
  const past = useInfiniteEvents({ to: shiftDay(today, -1), sort: 'desc', ...kind });
  const pastItems = past.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upcoming</CardTitle>
        </CardHeader>
        {upcoming.isPending ? (
          <ul>
            <EventListItemSkeleton />
            <EventListItemSkeleton />
          </ul>
        ) : upcoming.isError ? (
          <ErrorState title="Couldn't load events" error={upcoming.error} onRetry={() => upcoming.refetch()} />
        ) : upcoming.data.items.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nothing scheduled"
            className="py-10"
            action={isAdmin && <Button onClick={() => actions.create()}>Schedule an event</Button>}
          />
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {upcoming.data.items.map((e) => (
              <EventListItem key={e._id} event={e} onOpen={actions.open} />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Past</CardTitle>
        </CardHeader>
        {past.isPending ? (
          <ul>
            <EventListItemSkeleton />
          </ul>
        ) : past.isError ? (
          <ErrorState title="Couldn't load events" error={past.error} onRetry={() => past.refetch()} />
        ) : pastItems.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No past events.</p>
        ) : (
          <>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {pastItems.map((e) => (
                <EventListItem key={e._id} event={e} onOpen={actions.open} />
              ))}
            </ul>
            {past.hasNextPage && (
              <div className="border-t border-zinc-100 p-3 text-center dark:border-zinc-800">
                <Button variant="ghost" size="sm" onClick={() => past.fetchNextPage()} loading={past.isFetchingNextPage}>
                  Load older events
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
