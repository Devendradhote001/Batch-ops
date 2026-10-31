import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Card } from './Card';
import { ErrorState } from './ErrorState';
import { Skeleton } from './Skeleton';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  getRowId: (row: T) => string;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Rendered when the request succeeded with no rows. */
  empty: ReactNode;
  footer?: ReactNode;
  skeletonRows?: number;
  rowClassName?: (row: T) => string | undefined;
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  isLoading,
  error,
  onRetry,
  empty,
  footer,
  skeletonRows = 5,
  rowClassName,
}: DataTableProps<T>) {
  let body: ReactNode;

  if (isLoading) {
    body = Array.from({ length: skeletonRows }, (_, i) => (
      <tr key={i}>
        {columns.map((col) => (
          <td key={col.key} className={cn('px-4 py-3.5', col.className)}>
            <Skeleton className="h-4 w-full max-w-40" />
          </td>
        ))}
      </tr>
    ));
  } else if (error) {
    body = (
      <tr>
        <td colSpan={columns.length}>
          <ErrorState error={error} onRetry={onRetry} />
        </td>
      </tr>
    );
  } else if (!rows?.length) {
    body = (
      <tr>
        <td colSpan={columns.length}>{empty}</td>
      </tr>
    );
  } else {
    body = rows.map((row) => (
      <tr key={getRowId(row)} className={cn('transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30', rowClassName?.(row))}>
        {columns.map((col) => (
          <td key={col.key} className={cn('px-4 py-3 align-middle', col.className)}>
            {col.cell(row)}
          </td>
        ))}
      </tr>
    ));
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn('px-4 py-2.5 text-xs font-medium whitespace-nowrap text-zinc-500 dark:text-zinc-400', col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">{body}</tbody>
        </table>
      </div>
      {footer && <div className="border-t border-zinc-200 dark:border-zinc-800">{footer}</div>}
    </Card>
  );
}
