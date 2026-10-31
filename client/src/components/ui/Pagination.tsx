import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@batchops/shared';
import { cn } from '@/lib/cn';
import { Button } from './Button';

interface PaginationProps {
  meta: PaginationMeta | undefined;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ meta, onPageChange, className }: PaginationProps) {
  if (!meta || meta.total === 0) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className={cn('flex items-center justify-between gap-4 px-4 py-3 text-sm', className)}>
      <p className="text-zinc-500 dark:text-zinc-400">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {from}–{to}
        </span>{' '}
        of {meta.total}
      </p>
      {meta.totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label="Previous page"
            disabled={meta.page <= 1}
            onClick={() => onPageChange(meta.page - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="px-2 text-zinc-500 tabular-nums dark:text-zinc-400">
            {meta.page} / {meta.totalPages}
          </span>
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label="Next page"
            disabled={meta.page >= meta.totalPages}
            onClick={() => onPageChange(meta.page + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
