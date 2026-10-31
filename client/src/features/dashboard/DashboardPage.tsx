import { Activity, ArrowRight, CalendarClock, CalendarDays, Layers, NotebookPen, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { useAuthUser } from '@/features/auth/api';
import { EventListItem } from '@/features/events/components/EventListItem';
import { useEventActions } from '@/features/events/useEventActions';
import { SessionItem } from '@/features/sessions/components/SessionItem';
import { formatDuration } from '@/features/sessions/meta';
import { canLogSessions } from '@/features/sessions/permissions';
import { useSessionActions } from '@/features/sessions/useSessionActions';
import { UpdateStatusBadge } from '@/features/updates/components/UpdateStatusBadge';
import { dayjs, greetingIST } from '@/lib/day';
import { useDashboard, type Dashboard } from './api';

/** "What's happening in the vertical today" — role-aware, from a single request. */
export function DashboardPage() {
  const user = useAuthUser();
  const dashboard = useDashboard();
  const sessionActions = useSessionActions();
  const eventActions = useEventActions();
  const firstName = user.name.split(' ')[0];

  return (
    <>
      <PageHeader
        title={`${greetingIST()}, ${firstName}`}
        description={
          user.role === 'instructor' ? "Here's your day across the batches you teach." : "Here's what's happening across the vertical today."
        }
        actions={
          canLogSessions(user) && (
            <Button onClick={() => sessionActions.log()}>
              <Plus className="size-4" /> Log session
            </Button>
          )
        }
      />

      {dashboard.isPending ? (
        <DashboardSkeleton />
      ) : dashboard.isError ? (
        <Card>
          <ErrorState title="Couldn't load the dashboard" error={dashboard.error} onRetry={() => dashboard.refetch()} />
        </Card>
      ) : (
        <DashboardContent data={dashboard.data} onOpenEvent={eventActions.open} sessionActions={sessionActions} />
      )}

      {sessionActions.dialogs}
      {eventActions.dialogs}
    </>
  );
}

interface ContentProps {
  data: Dashboard;
  onOpenEvent: ReturnType<typeof useEventActions>['open'];
  sessionActions: ReturnType<typeof useSessionActions>;
}

function DashboardContent({ data, onOpenEvent, sessionActions }: ContentProps) {
  const user = useAuthUser();
  const navigate = useNavigate();
  const isAdmin = user.role === 'admin';
  const update = data.todaysUpdate;
  const held = data.sessionsToday.filter((s) => s.status === 'completed');
  const minutes = held.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <div className="space-y-6">
      {isAdmin && update && !update.filed && (
        <div className="flex flex-col gap-3 rounded-lg border border-accent-200 bg-accent-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-accent-500/30 dark:bg-accent-500/10">
          <div className="flex items-center gap-3">
            <NotebookPen className="size-5 shrink-0 text-accent-600 dark:text-accent-300" aria-hidden />
            <div>
              <p className="text-sm font-medium">Today's update isn't filed yet</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">Your manager reads it at the end of the day.</p>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate(`/updates/${data.today}/edit`)}>
            File today's update
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Sessions today"
          icon={CalendarClock}
          value={data.sessionsToday.length}
          hint={held.length ? `${formatDuration(minutes)} taught` : 'none held yet'}
        />
        <StatCard label={user.role === 'instructor' ? 'Your active batches' : 'Active batches'} icon={Layers} value={data.activeBatches.total} />
        <StatCard label="Events this week" icon={CalendarDays} value={data.upcomingEvents.total} hint="next 7 days" />
        {update ? (
          <StatCard
            label="Today's update"
            icon={NotebookPen}
            value={update.filed ? 'Filed' : 'Not yet'}
            hint={update.status ? <UpdateStatusBadge status={update.status} /> : 'due by end of day'}
          />
        ) : (
          <StatCard label="Taught today" icon={Activity} value={formatDuration(minutes)} hint={`${held.length} session${held.length === 1 ? '' : 's'}`} />
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Today's sessions" link={{ to: '/sessions', label: 'All sessions' }}>
            {data.sessionsToday.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No sessions logged today"
                className="py-10"
                action={
                  canLogSessions(user) && (
                    <Button variant="secondary" size="sm" onClick={() => sessionActions.log()}>
                      Log a session
                    </Button>
                  )
                }
              />
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {data.sessionsToday.map((s) => (
                  <SessionItem key={s._id} session={s} onEdit={sessionActions.edit} onDelete={sessionActions.remove} />
                ))}
              </ul>
            )}
          </Section>

          {data.recentUpdates && (
            <Section title="Recent daily updates" link={{ to: '/updates', label: 'All updates' }}>
              {data.recentUpdates.length === 0 ? (
                <EmptyState icon={NotebookPen} title="No updates filed yet" className="py-10" />
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {data.recentUpdates.map((u) => (
                    <li key={u._id} className="px-5 py-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{dayjs(u.day).format('ddd, D MMM')}</p>
                        <UpdateStatusBadge status={u.status} />
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{u.summary}</p>
                      {u.blockers.length > 0 && (
                        <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                          Blocker: {u.blockers[0]}
                          {u.blockers.length > 1 && ` (+${u.blockers.length - 1} more)`}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}
        </div>

        <div className="space-y-6">
          <Section title="Coming up" link={{ to: '/events?view=list', label: 'All events' }}>
            {data.upcomingEvents.items.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Nothing in the next 7 days.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {data.upcomingEvents.items.map((e) => (
                  <EventListItem key={e._id} event={e} onOpen={onOpenEvent} compact />
                ))}
              </ul>
            )}
          </Section>

          <Section title={user.role === 'instructor' ? 'Your batches' : 'Active batches'} link={{ to: '/batches', label: 'All batches' }}>
            {data.activeBatches.items.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No active batches.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {data.activeBatches.items.map((b) => (
                  <li key={b._id}>
                    <Link to={`/batches/${b._id}`} className="block px-5 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{b.code}</span>
                        <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                          {b.stats.sessionsCompleted}/{b.totalPlannedSessions} · {b.stats.progress}%
                        </span>
                      </div>
                      <ProgressBar value={b.stats.progress} label={`${b.code} progress`} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {data.recentActivity && (
            <Section title="Recent activity">
              {data.recentActivity.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No activity yet.</p>
              ) : (
                <ul className="space-y-3.5 px-5 py-4">
                  {data.recentActivity.map((a) => (
                    <li key={a._id} className="flex gap-3">
                      {a.actor ? <Avatar name={a.actor.name} color={a.actor.avatarColor} size="sm" className="mt-0.5" /> : <span className="size-6" />}
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">{a.summary}</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500" title={dayjs(a.createdAt).format('D MMM YYYY, h:mm A')}>
                          {dayjs(a.createdAt).fromNow()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, link, children }: { title: string; link?: { to: string; label: string }; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {link && (
          <Link to={link.to} className="flex shrink-0 items-center gap-1 text-xs whitespace-nowrap text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            {link.label} <ArrowRight className="size-3.5" />
          </Link>
        )}
      </CardHeader>
      {children}
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-lg lg:col-span-2" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}
