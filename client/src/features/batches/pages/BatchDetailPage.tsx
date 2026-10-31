import { isAxiosError } from 'axios';
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Crown,
  Layers,
  ListChecks,
  Pencil,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { Batch } from '@batchops/shared';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { useAuthUser } from '@/features/auth/api';
import { getErrorMessage } from '@/lib/api';
import { useArchiveBatch, useBatch } from '../api';
import { BatchFormModal } from '../components/BatchFormModal';
import { BatchStatusBadge } from '../components/BatchStatusBadge';
import { ModuleChecklist } from '../components/ModuleChecklist';
import { formatDay, formatScheduleDays, formatTime } from '../meta';

export function BatchDetailPage() {
  const { batchId = '' } = useParams();
  const batch = useBatch(batchId);

  return (
    <>
      <Link
        to="/batches"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="size-4" /> Batches
      </Link>
      {batch.isPending ? (
        <DetailSkeleton />
      ) : batch.isError ? (
        <Card>
          {isAxiosError(batch.error) && batch.error.response?.status === 404 ? (
            <EmptyState icon={Layers} title="Batch not found" description="It may have been removed, or you're not assigned to it." />
          ) : (
            <ErrorState title="Couldn't load this batch" error={batch.error} onRetry={() => batch.refetch()} />
          )}
        </Card>
      ) : (
        <BatchDetail batch={batch.data} />
      )}
    </>
  );
}

function BatchDetail({ batch }: { batch: Batch }) {
  const user = useAuthUser();
  const isAdmin = user.role === 'admin';
  const archive = useArchiveBatch();
  const [editing, setEditing] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const { stats } = batch;

  const toggleArchive = () =>
    archive.mutate(
      { id: batch._id, isArchived: !batch.isArchived },
      {
        onSuccess: (b) => {
          toast.success(b.isArchived ? `${b.code} archived` : `${b.code} restored`);
          setConfirmArchive(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{batch.code}</span>
            <BatchStatusBadge status={batch.status} />
            {batch.isArchived && <Badge>Archived</Badge>}
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{batch.name}</h1>
          {batch.description && <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">{batch.description}</p>}
        </div>
        {isAdmin && (
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" onClick={() => (batch.isArchived ? toggleArchive() : setConfirmArchive(true))} loading={archive.isPending && !confirmArchive}>
              {batch.isArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
              {batch.isArchived ? 'Restore' : 'Archive'}
            </Button>
            <Button onClick={() => setEditing(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Progress" icon={TrendingUp} value={`${stats.progress}%`} hint={<ProgressBar value={stats.progress} className="mt-2" />} />
        <StatCard
          label="Sessions completed"
          icon={CalendarClock}
          value={stats.sessionsCompleted}
          hint={`of ${batch.totalPlannedSessions} planned`}
        />
        <StatCard
          label="Modules done"
          icon={ListChecks}
          value={`${stats.modulesCompleted}/${stats.modulesTotal}`}
          hint={stats.modulesTotal ? `${Math.round((stats.modulesCompleted / stats.modulesTotal) * 100)}% of syllabus` : 'No syllabus yet'}
        />
        <StatCard label="Students" icon={Users} value={batch.studentCount} hint="enrolled" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Syllabus</CardTitle>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {stats.modulesCompleted} of {stats.modulesTotal} complete
              </span>
            </CardHeader>
            <ModuleChecklist batch={batch} editable={isAdmin} />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessions</CardTitle>
            </CardHeader>
            <EmptyState icon={CalendarClock} title="Session timeline arrives in Phase 3" description="Sessions logged for this batch will be grouped by day here." className="py-10" />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Events</CardTitle>
            </CardHeader>
            <EmptyState icon={CalendarDays} title="Events arrive in Phase 4" description="Workshops, hackathons and assessments linked to this batch." className="py-10" />
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-sm">
              <DetailRow icon={CalendarDays} label="Runs">
                {formatDay(batch.startDate)} – {formatDay(batch.endDate)}
              </DetailRow>
              <DetailRow icon={Clock} label="Schedule">
                {formatScheduleDays(batch.schedule.days)}
                <span className="block text-zinc-500 dark:text-zinc-400">
                  {formatTime(batch.schedule.startTime)} – {formatTime(batch.schedule.endTime)} IST
                </span>
              </DetailRow>
              <DetailRow icon={CheckCircle2} label="Planned sessions">
                {batch.totalPlannedSessions}
              </DetailRow>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instructors</CardTitle>
            </CardHeader>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {[...batch.instructors]
                .sort((a, b) => Number(b._id === batch.leadInstructor._id) - Number(a._id === batch.leadInstructor._id))
                .map((u) => (
                  <li key={u._id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={u.name} color={u.avatarColor} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{u.email}</p>
                    </div>
                    {u._id === batch.leadInstructor._id && (
                      <Badge tone="warning">
                        <Crown className="size-3" /> Lead
                      </Badge>
                    )}
                    {u.isActive === false && <Badge>Deactivated</Badge>}
                  </li>
                ))}
            </ul>
          </Card>
        </div>
      </div>

      {isAdmin && (
        <>
          <BatchFormModal open={editing} onClose={() => setEditing(false)} batch={batch} />
          <ConfirmDialog
            open={confirmArchive}
            onClose={() => setConfirmArchive(false)}
            onConfirm={toggleArchive}
            loading={archive.isPending}
            title={`Archive ${batch.code}?`}
            confirmLabel="Archive"
            description="Archived batches are hidden from lists and dashboards. All sessions and history are kept, and you can restore it any time."
          />
        </>
      )}
    </>
  );
}

function DetailRow({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
        <div className="font-medium">{children}</div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-2 h-7 w-72" />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-lg lg:col-span-2" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </>
  );
}
