import { CalendarDays } from 'lucide-react';
import type { ReactNode } from 'react';
import type { VerticalEvent } from '@batchops/shared';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useEvents } from '../api';
import { EventListItem, EventListItemSkeleton } from './EventListItem';

const LIMIT = 10;

/** Events linked to a batch, newest first. */
export function BatchEvents({ batchId, onOpen, emptyAction }: { batchId: string; onOpen: (e: VerticalEvent) => void; emptyAction?: ReactNode }) {
  const events = useEvents({ batch: batchId, sort: 'desc', limit: LIMIT });

  if (events.isPending) {
    return (
      <ul>
        <EventListItemSkeleton />
      </ul>
    );
  }
  if (events.isError) return <ErrorState title="Couldn't load events" error={events.error} onRetry={() => events.refetch()} />;
  if (events.data.items.length === 0) {
    return <EmptyState icon={CalendarDays} title="No events for this batch" className="py-10" action={emptyAction} />;
  }

  return (
    <>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {events.data.items.map((e) => (
          <EventListItem key={e._id} event={e} onOpen={onOpen} />
        ))}
      </ul>
      {events.data.meta.total > LIMIT && (
        <p className="border-t border-zinc-100 px-5 py-2.5 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Showing the latest {LIMIT} of {events.data.meta.total}.
        </p>
      )}
    </>
  );
}
