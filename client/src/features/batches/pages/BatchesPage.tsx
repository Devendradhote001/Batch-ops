import { Layers, Plus, SearchX } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { useAuthUser } from '@/features/auth/api';
import { useUrlFilters } from '@/lib/useUrlFilters';
import { useBatches } from '../api';
import { BatchCard, BatchCardSkeleton } from '../components/BatchCard';
import { BatchFilters } from '../components/BatchFilters';
import { BatchFormModal } from '../components/BatchFormModal';

const FILTER_KEYS = ['q', 'status', 'instructor'] as const;

export function BatchesPage() {
  const user = useAuthUser();
  const navigate = useNavigate();
  const isAdmin = user.role === 'admin';
  const [filters, setFilters] = useUrlFilters(FILTER_KEYS);
  const batches = useBatches(filters);
  const [creating, setCreating] = useState(false);

  const hasFilters = !!(filters.q || filters.status || filters.instructor);
  const items = batches.data?.items;

  let content;
  if (batches.isPending) {
    content = (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <BatchCardSkeleton key={i} />
        ))}
      </div>
    );
  } else if (batches.isError) {
    content = (
      <Card>
        <ErrorState title="Couldn't load batches" error={batches.error} onRetry={() => batches.refetch()} />
      </Card>
    );
  } else if (!items?.length) {
    content = (
      <Card>
        {hasFilters ? (
          <EmptyState
            icon={SearchX}
            title="No batches match these filters"
            action={
              <Button variant="secondary" size="sm" onClick={() => setFilters({ q: '', status: '', instructor: '' })}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Layers}
            title={user.role === 'instructor' ? "You're not assigned to any batches yet" : 'No batches yet'}
            description={
              isAdmin
                ? 'Create the first batch to start tracking sessions and progress.'
                : user.role === 'instructor'
                  ? 'Once the admin adds you to a batch it will show up here.'
                  : 'Batches will appear here once the admin creates them.'
            }
            action={isAdmin && <Button onClick={() => setCreating(true)}>Create a batch</Button>}
          />
        )}
      </Card>
    );
  } else {
    content = (
      <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((batch) => (
            <BatchCard key={batch._id} batch={batch} />
          ))}
        </div>
        <Pagination className="mt-2 px-0" meta={batches.data?.meta} onPageChange={(page) => setFilters({ page })} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Batches"
        description={user.role === 'instructor' ? 'Batches you teach.' : 'Every running and planned batch in the vertical.'}
        actions={
          isAdmin && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> New batch
            </Button>
          )
        }
      />
      <BatchFilters values={filters} onChange={setFilters} showInstructor={user.role !== 'instructor'} />
      {content}
      {isAdmin && (
        <BatchFormModal open={creating} onClose={() => setCreating(false)} onSaved={(b) => navigate(`/batches/${b._id}`)} />
      )}
    </>
  );
}
