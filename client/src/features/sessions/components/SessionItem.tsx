import { Clock, ExternalLink, Pencil, Trash2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Session } from '@batchops/shared';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthUser } from '@/features/auth/api';
import { cn } from '@/lib/cn';
import { SESSION_STATUS_META, SESSION_TYPE_META, formatDuration } from '../meta';
import { canEditSession } from '../permissions';

interface SessionItemProps {
  session: Session;
  /** Show which batch it belongs to (off inside a batch's own timeline). */
  showBatch?: boolean;
  onEdit: (session: Session) => void;
  onDelete: (session: Session) => void;
}

export function SessionItem({ session, showBatch = true, onEdit, onDelete }: SessionItemProps) {
  const user = useAuthUser();
  const { icon: TypeIcon, label: typeLabel } = SESSION_TYPE_META[session.type];
  const status = SESSION_STATUS_META[session.status];
  const isCompleted = session.status === 'completed';

  return (
    <li className="flex gap-3.5 px-4 py-4 sm:px-5">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg border',
          isCompleted
            ? 'border-accent-200 bg-accent-50 text-accent-600 dark:border-accent-500/30 dark:bg-accent-500/10 dark:text-accent-300'
            : 'border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/50',
        )}
        title={typeLabel}
      >
        <TypeIcon className="size-4" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className={cn('font-medium', !isCompleted && 'text-zinc-500 line-through decoration-zinc-300 dark:text-zinc-400 dark:decoration-zinc-600')}>
            {session.title}
          </p>
          {!isCompleted && <Badge tone={status.tone}>{status.label}</Badge>}
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {showBatch && (
            <>
              <Link to={`/batches/${session.batch._id}`} className="font-mono hover:text-accent-700 hover:underline dark:hover:text-accent-300">
                {session.batch.code}
              </Link>
              {' · '}
            </>
          )}
          {typeLabel}
          {session.topic && ` · ${session.topic}`}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Avatar name={session.instructor.name} color={session.instructor.avatarColor} size="sm" />
            {session.instructor.name}
          </span>
          {isCompleted && (
            <>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden /> {formatDuration(session.durationMinutes)}
              </span>
              <span className="flex items-center gap-1" title="Attendance">
                <Users className="size-3.5" aria-hidden /> {session.attendanceCount}
                <span className="text-zinc-400">/ {session.batch.studentCount}</span>
              </span>
            </>
          )}
          {session.recordingLink && (
            <a
              href={session.recordingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-accent-700 hover:underline dark:text-accent-300"
            >
              <ExternalLink className="size-3.5" aria-hidden /> Recording
            </a>
          )}
        </div>

        {session.notes && <p className="mt-2 line-clamp-2 text-sm whitespace-pre-line text-zinc-600 dark:text-zinc-400">{session.notes}</p>}
      </div>

      {canEditSession(user, session) && (
        <div className="-mr-1.5 flex shrink-0 items-start gap-0.5">
          <Button variant="ghost" size="icon-sm" title="Edit" aria-label={`Edit ${session.title}`} onClick={() => onEdit(session)}>
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Delete"
            aria-label={`Delete ${session.title}`}
            onClick={() => onDelete(session)}
            className="hover:text-red-600 dark:hover:text-red-400"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
    </li>
  );
}

export function SessionItemSkeleton() {
  return (
    <li className="flex gap-3.5 px-4 py-4 sm:px-5">
      <Skeleton className="size-9 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </li>
  );
}
