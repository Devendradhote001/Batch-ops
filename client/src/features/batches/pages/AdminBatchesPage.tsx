import { Archive, ArchiveRestore, Layers, Pencil, Plus, SearchX } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { Batch } from '@batchops/shared';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Select } from '@/components/ui/Select';
import { getErrorMessage } from '@/lib/api';
import { useUrlFilters } from '@/lib/useUrlFilters';
import { useArchiveBatch, useBatches } from '../api';
import { BatchFilters } from '../components/BatchFilters';
import { BatchFormModal } from '../components/BatchFormModal';
import { BatchStatusBadge } from '../components/BatchStatusBadge';
import { formatDayRange } from '../meta';

const FILTER_KEYS = ['q', 'status', 'instructor', 'archived'] as const;

export function AdminBatchesPage() {
  const [filters, setFilters] = useUrlFilters(FILTER_KEYS);
  const batches = useBatches({ ...filters, limit: 20 });
  const archive = useArchiveBatch();
  const [form, setForm] = useState<{ open: boolean; batch?: Batch }>({ open: false });
  const [archiveFor, setArchiveFor] = useState<Batch | null>(null);

  const hasFilters = !!(filters.q || filters.status || filters.instructor || filters.archived);

  const setArchived = (batch: Batch, isArchived: boolean) =>
    archive.mutate(
      { id: batch._id, isArchived },
      {
        onSuccess: (b) => {
          toast.success(b.isArchived ? `${b.code} archived` : `${b.code} restored`);
          setArchiveFor(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );

  const columns: Column<Batch>[] = [
    {
      key: 'batch',
      header: 'Batch',
      cell: (b) => (
        <Link to={`/batches/${b._id}`} className="group block min-w-48">
          <p className="font-medium text-zinc-900 group-hover:text-accent-700 dark:text-zinc-100 dark:group-hover:text-accent-300">{b.name}</p>
          <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{b.code}</p>
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (b) => (
        <div className="flex gap-1.5">
          <BatchStatusBadge status={b.status} />
          {b.isArchived && <Badge>Archived</Badge>}
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'Dates',
      className: 'hidden xl:table-cell',
      cell: (b) => <span className="whitespace-nowrap text-zinc-600 dark:text-zinc-400">{formatDayRange(b.startDate, b.endDate)}</span>,
    },
    {
      key: 'lead',
      header: 'Lead',
      className: 'hidden lg:table-cell',
      cell: (b) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Avatar name={b.leadInstructor.name} color={b.leadInstructor.avatarColor} size="sm" />
          {b.leadInstructor.name}
        </div>
      ),
    },
    {
      key: 'progress',
      header: 'Progress',
      cell: (b) => (
        <div className="flex items-center gap-2">
          <ProgressBar value={b.stats.progress} className="w-20" label={`${b.name} progress`} />
          <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">{b.stats.progress}%</span>
        </div>
      ),
    },
    {
      key: 'students',
      header: 'Students',
      className: 'hidden sm:table-cell text-right',
      cell: (b) => <span className="tabular-nums">{b.studentCount}</span>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      className: 'w-0 text-right',
      cell: (b) => (
        <div className="flex justify-end gap-0.5">
          <Button variant="ghost" size="icon-sm" title="Edit" aria-label={`Edit ${b.code}`} onClick={() => setForm({ open: true, batch: b })}>
            <Pencil className="size-4" />
          </Button>
          {b.isArchived ? (
            <Button variant="ghost" size="icon-sm" title="Restore" aria-label={`Restore ${b.code}`} onClick={() => setArchived(b, false)}>
              <ArchiveRestore className="size-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon-sm" title="Archive" aria-label={`Archive ${b.code}`} onClick={() => setArchiveFor(b)}>
              <Archive className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Manage batches"
        description="Create, edit and archive batches. Archiving keeps all history."
        actions={
          <Button onClick={() => setForm({ open: true })}>
            <Plus className="size-4" /> New batch
          </Button>
        }
      />

      <BatchFilters values={filters} onChange={setFilters} showInstructor>
        <Select
          value={filters.archived}
          onChange={(e) => setFilters({ archived: e.target.value })}
          aria-label="Archived batches"
          wrapperClassName="col-span-2 sm:w-40"
        >
          <option value="">Not archived</option>
          <option value="true">Archived only</option>
          <option value="all">All batches</option>
        </Select>
      </BatchFilters>

      <DataTable
        columns={columns}
        rows={batches.data?.items}
        getRowId={(b) => b._id}
        isLoading={batches.isPending}
        error={batches.error}
        onRetry={() => batches.refetch()}
        rowClassName={(b) => (b.isArchived ? 'opacity-60' : undefined)}
        empty={
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              title="No batches match these filters"
              action={
                <Button variant="secondary" size="sm" onClick={() => setFilters({ q: '', status: '', instructor: '', archived: '' })}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Layers}
              title="No batches yet"
              description="Create a batch, assign its instructors and add the syllabus."
              action={<Button onClick={() => setForm({ open: true })}>Create a batch</Button>}
            />
          )
        }
        footer={<Pagination meta={batches.data?.meta} onPageChange={(page) => setFilters({ page })} />}
      />

      <BatchFormModal open={form.open} batch={form.batch} onClose={() => setForm({ open: false })} />
      <ConfirmDialog
        open={!!archiveFor}
        onClose={() => setArchiveFor(null)}
        onConfirm={() => archiveFor && setArchived(archiveFor, true)}
        loading={archive.isPending}
        title={`Archive ${archiveFor?.code}?`}
        confirmLabel="Archive"
        description="Archived batches are hidden from lists and dashboards. All sessions and history are kept, and you can restore it any time."
      />
    </>
  );
}
