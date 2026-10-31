import { CalendarRange, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Batch } from '@batchops/shared';
import { AvatarStack } from '@/components/ui/AvatarStack';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDayRange } from '../meta';
import { BatchStatusBadge } from './BatchStatusBadge';

export function BatchCard({ batch }: { batch: Batch }) {
  const { stats } = batch;

  return (
    <Link to={`/batches/${batch._id}`} className="group block rounded-lg focus-visible:ring-2 focus-visible:ring-accent-500/40 focus-visible:outline-none">
      <Card className="flex h-full flex-col p-5 transition-colors group-hover:border-zinc-300 dark:group-hover:border-zinc-700">
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{batch.code}</span>
          <div className="flex gap-1.5">
            {batch.isArchived && <Badge>Archived</Badge>}
            <BatchStatusBadge status={batch.status} />
          </div>
        </div>
        <h3 className="mt-1.5 line-clamp-1 font-semibold text-zinc-900 group-hover:text-accent-700 dark:text-zinc-100 dark:group-hover:text-accent-300">
          {batch.name}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <CalendarRange className="size-3.5" />
          {formatDayRange(batch.startDate, batch.endDate)}
        </p>

        <div className="mt-5">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">
              {stats.sessionsCompleted} of {batch.totalPlannedSessions} sessions
            </span>
            <span className="font-medium tabular-nums">{stats.progress}%</span>
          </div>
          <ProgressBar value={stats.progress} label={`${batch.name} progress`} />
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <AvatarStack users={batch.instructors} />
          <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Users className="size-3.5" />
            {batch.studentCount} students
          </span>
        </div>
      </Card>
    </Link>
  );
}

export function BatchCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-5 w-14" />
      </div>
      <Skeleton className="mt-3 h-5 w-3/4" />
      <Skeleton className="mt-2 h-3.5 w-1/2" />
      <Skeleton className="mt-6 h-1.5 w-full" />
      <div className="mt-6 flex justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-3.5 w-20" />
      </div>
    </Card>
  );
}
