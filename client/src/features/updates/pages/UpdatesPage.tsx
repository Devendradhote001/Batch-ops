import { NotebookPen, Pencil, Plus, SearchX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UPDATE_STATUSES } from '@batchops/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { useAuthUser } from '@/features/auth/api';
import { todayIST } from '@/lib/day';
import { useUrlFilters } from '@/lib/useUrlFilters';
import { useUpdate, useUpdatesFeed } from '../api';
import { UpdateCard, UpdateCardSkeleton } from '../components/UpdateCard';
import { UPDATE_STATUS_META } from '../meta';

const FILTER_KEYS = ['from', 'to', 'status'] as const;

export function UpdatesPage() {
  const user = useAuthUser();
  const navigate = useNavigate();
  const isAdmin = user.role === 'admin';
  const today = todayIST();
  const [filters, setFilters] = useUrlFilters(FILTER_KEYS);
  const feed = useUpdatesFeed({ from: filters.from, to: filters.to, status: filters.status });
  const todays = useUpdate(today, isAdmin);

  const updates = feed.data?.pages.flatMap((p) => p.items) ?? [];
  const hasFilters = !!(filters.from || filters.to || filters.status);
  const filedToday = !!todays.data;

  return (
    <>
      <PageHeader
        title="Daily updates"
        description="End-of-day notes on how the vertical is doing."
        actions={
          isAdmin && (
            <Button variant={filedToday ? 'secondary' : 'primary'} onClick={() => navigate(`/updates/${today}/edit`)}>
              {filedToday ? <Pencil className="size-4" /> : <Plus className="size-4" />}
              {filedToday ? "Edit today's update" : "File today's update"}
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Input
            type="date"
            value={filters.from}
            max={filters.to || today}
            onChange={(e) => setFilters({ from: e.target.value })}
            aria-label="From date"
            className="sm:w-40"
          />
          <Input
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            max={today}
            onChange={(e) => setFilters({ to: e.target.value })}
            aria-label="To date"
            className="sm:w-40"
          />
        </div>
        <Select value={filters.status} onChange={(e) => setFilters({ status: e.target.value })} aria-label="Filter by status" wrapperClassName="sm:w-40">
          <option value="">Any status</option>
          {UPDATE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {UPDATE_STATUS_META[s].label}
            </option>
          ))}
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({ from: '', to: '', status: '' })}>
            Clear
          </Button>
        )}
      </div>

      {feed.isPending ? (
        <div className="space-y-4">
          <UpdateCardSkeleton />
          <UpdateCardSkeleton />
        </div>
      ) : feed.isError ? (
        <Card>
          <ErrorState title="Couldn't load updates" error={feed.error} onRetry={() => feed.refetch()} />
        </Card>
      ) : updates.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState icon={SearchX} title="No updates in this range" />
          ) : (
            <EmptyState
              icon={NotebookPen}
              title="No daily updates yet"
              description={isAdmin ? 'File an update at the end of each day so your manager can follow along.' : 'Updates from the vertical lead will appear here.'}
              action={
                isAdmin && <Button onClick={() => navigate(`/updates/${today}/edit`)}>File today's update</Button>
              }
            />
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {updates.map((u) => (
            <UpdateCard key={u._id} update={u} canEdit={isAdmin} />
          ))}
          {feed.hasNextPage && (
            <div className="text-center">
              <Button variant="secondary" size="sm" onClick={() => feed.fetchNextPage()} loading={feed.isFetchingNextPage}>
                Load older updates
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
