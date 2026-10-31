import { CalendarClock } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Session } from '@batchops/shared';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { dayjs, todayIST } from '@/lib/day';
import { useInfiniteSessions } from '../api';
import { SessionItem, SessionItemSkeleton } from './SessionItem';

interface SessionTimelineProps {
  batchId: string;
  onEdit: (session: Session) => void;
  onDelete: (session: Session) => void;
  emptyAction?: ReactNode;
}

function groupByDay(sessions: Session[]) {
  const groups = new Map<string, Session[]>();
  for (const s of sessions) groups.set(s.day, [...(groups.get(s.day) ?? []), s]);
  return [...groups.entries()];
}

function dayLabel(day: string) {
  const today = todayIST();
  if (day === today) return 'Today';
  if (day === dayjs(today).subtract(1, 'day').format('YYYY-MM-DD')) return 'Yesterday';
  return dayjs(day).format(dayjs(day).year() === dayjs(today).year() ? 'ddd, D MMM' : 'ddd, D MMM YYYY');
}

/** A batch's sessions, newest first, grouped under day headings. */
export function SessionTimeline({ batchId, onEdit, onDelete, emptyAction }: SessionTimelineProps) {
  const query = useInfiniteSessions({ batch: batchId });

  if (query.isPending) {
    return (
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {Array.from({ length: 3 }, (_, i) => (
          <SessionItemSkeleton key={i} />
        ))}
      </ul>
    );
  }
  if (query.isError) return <ErrorState title="Couldn't load sessions" error={query.error} onRetry={() => query.refetch()} />;

  const sessions = query.data.pages.flatMap((p) => p.items);
  if (sessions.length === 0) {
    return <EmptyState icon={CalendarClock} title="No sessions logged yet" className="py-10" action={emptyAction} />;
  }

  return (
    <div>
      {groupByDay(sessions).map(([day, daySessions]) => (
        <section key={day}>
          <h3 className="sticky top-14 z-10 flex items-center justify-between border-y border-zinc-100 bg-zinc-50/95 px-5 py-1.5 text-xs font-medium text-zinc-500 backdrop-blur first:border-t-0 dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-400">
            {dayLabel(day)}
            <span className="font-normal">
              {daySessions.length} session{daySessions.length > 1 ? 's' : ''}
            </span>
          </h3>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {daySessions.map((s) => (
              <SessionItem key={s._id} session={s} showBatch={false} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </ul>
        </section>
      ))}
      {query.hasNextPage && (
        <div className="border-t border-zinc-100 p-3 text-center dark:border-zinc-800">
          <Button variant="ghost" size="sm" onClick={() => query.fetchNextPage()} loading={query.isFetchingNextPage}>
            Load older sessions
          </Button>
        </div>
      )}
    </div>
  );
}
