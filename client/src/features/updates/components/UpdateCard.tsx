import { ArrowRight, Check, CircleAlert, Pencil, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DailyUpdate } from '@batchops/shared';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { dayjs, formatDateTime, todayIST } from '@/lib/day';
import { UpdateStatusBadge } from './UpdateStatusBadge';

interface UpdateCardProps {
  update: DailyUpdate;
  canEdit: boolean;
}

export function UpdateCard({ update, canEdit }: UpdateCardProps) {
  const isToday = update.day === todayIST();
  const edited = dayjs(update.updatedAt).diff(update.createdAt, 'minute') >= 1;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <div>
          <h3 className="font-semibold">
            {isToday ? 'Today' : dayjs(update.day).format('dddd')}
            <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">{dayjs(update.day).format('D MMM YYYY')}</span>
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Avatar name={update.author.name} color={update.author.avatarColor} size="sm" />
            {update.author.name} · {formatDateTime(update.updatedAt)}
            {edited && ' (edited)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <UpdateStatusBadge status={update.status} />
          {canEdit && (
            <Link
              to={`/updates/${update.day}/edit`}
              className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              aria-label={`Edit update for ${update.day}`}
              title="Edit"
            >
              <Pencil className="size-4" />
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-5 px-5 py-4">
        <p className="text-sm leading-relaxed whitespace-pre-line text-zinc-700 dark:text-zinc-300">{update.summary}</p>

        {(update.highlights.length > 0 || update.blockers.length > 0 || update.nextDayPlan.length > 0) && (
          <div className="grid gap-5 sm:grid-cols-3">
            <PointList title="Highlights" icon={Check} items={update.highlights} iconClass="text-emerald-600 dark:text-emerald-400" />
            <PointList title="Blockers" icon={CircleAlert} items={update.blockers} iconClass="text-red-600 dark:text-red-400" />
            <PointList title="Next day" icon={ArrowRight} items={update.nextDayPlan} iconClass="text-accent-600 dark:text-accent-400" />
          </div>
        )}

        {update.batchNotes.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">Batch notes</h4>
            <ul className="space-y-2">
              {update.batchNotes.map((n) => (
                <li key={n.batch._id} className="flex gap-3 text-sm">
                  <Link
                    to={`/batches/${n.batch._id}`}
                    className="h-fit shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    {n.batch.code}
                  </Link>
                  <span className="text-zinc-700 dark:text-zinc-300">{n.note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

function PointList({ title, icon: Icon, items, iconClass }: { title: string; icon: LucideIcon; items: string[]; iconClass: string }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">{title}</h4>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">—</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <Icon className={cn('mt-0.5 size-4 shrink-0', iconClass)} aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function UpdateCardSkeleton() {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    </Card>
  );
}
