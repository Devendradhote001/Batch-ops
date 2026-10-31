import { BarChart3, Table2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

export interface ChartTable {
  columns: string[];
  rows: (string | number | null)[][];
}

interface ChartCardProps {
  title: string;
  description?: string;
  /** Controls next to the title (e.g. a metric toggle). */
  actions?: ReactNode;
  isLoading: boolean;
  error?: unknown;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyMessage?: string;
  /** The same data as a table — the accessible / exact-values view. */
  table?: ChartTable;
  height?: number;
  className?: string;
  children: ReactNode;
}

/** Frame for every chart: title, loading/empty/error states, and a chart ⇄ table toggle. */
export function ChartCard({
  title,
  description,
  actions,
  isLoading,
  error,
  onRetry,
  isEmpty,
  emptyMessage = 'No data for this range.',
  table,
  height = 260,
  className,
  children,
}: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);
  const canToggle = !!table && !isLoading && !error && !isEmpty;

  let body: ReactNode;
  if (isLoading) body = <Skeleton className="w-full rounded-md" style={{ height }} />;
  else if (error) body = <ErrorState title="Couldn't load this chart" error={error} onRetry={onRetry} className="py-8" />;
  else if (isEmpty)
    body = (
      <div className="flex items-center justify-center text-sm text-zinc-500 dark:text-zinc-400" style={{ height }}>
        {emptyMessage}
      </div>
    );
  else if (showTable && table) body = <DataTableView table={table} maxHeight={height + 40} />;
  else body = children;

  return (
    <Card className={cn('flex min-w-0 flex-col p-5', className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription className="mt-0.5 text-xs">{description}</CardDescription>}
        </div>
        <div className="flex items-center gap-1.5">
          {actions}
          {canToggle && (
            <button
              type="button"
              onClick={() => setShowTable((s) => !s)}
              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              aria-label={showTable ? `Show ${title} as chart` : `Show ${title} as table`}
              title={showTable ? 'Show chart' : 'Show table'}
            >
              {showTable ? <BarChart3 className="size-4" /> : <Table2 className="size-4" />}
            </button>
          )}
        </div>
      </div>
      {body}
    </Card>
  );
}

function DataTableView({ table, maxHeight }: { table: ChartTable; maxHeight: number }) {
  return (
    <div className="overflow-auto rounded-md border border-zinc-100 dark:border-zinc-800" style={{ maxHeight }}>
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900">
          <tr>
            {table.columns.map((c, i) => (
              <th key={c} scope="col" className={cn('px-3 py-2 font-medium whitespace-nowrap text-zinc-500 dark:text-zinc-400', i > 0 && 'text-right')}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {table.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, i) => (
                <td key={i} className={cn('px-3 py-1.5 whitespace-nowrap', i > 0 ? 'text-right tabular-nums' : 'text-zinc-700 dark:text-zinc-300')}>
                  {cell ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
