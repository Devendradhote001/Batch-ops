import { Clock, Layers, MapPin } from 'lucide-react';
import type { VerticalEvent } from '@batchops/shared';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { dayjs } from '@/lib/day';
import { EVENT_STATUS_META, EVENT_TYPE_META, formatTimeRange } from '../meta';

interface EventListItemProps {
  event: VerticalEvent;
  onOpen: (event: VerticalEvent) => void;
  /** Hide the date block, e.g. inside a single-day agenda. */
  hideDate?: boolean;
  /** Narrow columns: drop location and the lead, keep date, type and time. */
  compact?: boolean;
}

export function EventListItem({ event, onOpen, hideDate, compact }: EventListItemProps) {
  const { icon: TypeIcon, label: typeLabel } = EVENT_TYPE_META[event.type];
  const status = EVENT_STATUS_META[event.status];
  const time = formatTimeRange(event.startTime, event.endTime);
  const isCancelled = event.status === 'cancelled';

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(event)}
        className="flex w-full gap-4 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 sm:px-5 dark:hover:bg-zinc-800/40"
      >
        {!hideDate && (
          <span className="flex w-11 shrink-0 flex-col items-center rounded-lg border border-zinc-200 py-1 dark:border-zinc-800">
            <span className="text-[10px] font-medium text-zinc-500 uppercase dark:text-zinc-400">{dayjs(event.day).format('MMM')}</span>
            <span className="text-lg leading-tight font-semibold tabular-nums">{dayjs(event.day).format('D')}</span>
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn('font-medium', isCancelled && 'text-zinc-400 line-through')}>{event.title}</span>
            {event.status !== 'planned' && <Badge tone={status.tone}>{status.label}</Badge>}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <TypeIcon className="size-3.5" aria-hidden /> {typeLabel}
            </span>
            {time && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden /> {time}
              </span>
            )}
            {event.location && !compact && (
              <span className="flex max-w-48 items-center gap-1 truncate">
                <MapPin className="size-3.5 shrink-0" aria-hidden /> <span className="truncate">{event.location}</span>
              </span>
            )}
            <span className={cn('flex items-center gap-1', compact && 'hidden')}>
              <Layers className="size-3.5" aria-hidden />
              {event.batches.length ? event.batches.map((b) => b.code).join(', ') : 'Vertical-wide'}
            </span>
          </span>
        </span>
        <span className={cn('hidden shrink-0 items-center gap-1.5 self-center text-xs text-zinc-500 dark:text-zinc-400', !compact && 'sm:flex')}>
          <Avatar name={event.leadBy.name} color={event.leadBy.avatarColor} size="sm" />
          {event.leadBy.name}
          {event.coLeads.length > 0 && <span className="text-zinc-400">+{event.coLeads.length}</span>}
        </span>
      </button>
    </li>
  );
}

export function EventListItemSkeleton() {
  return (
    <li className="flex gap-4 px-5 py-3.5">
      <Skeleton className="h-12 w-11 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </li>
  );
}
