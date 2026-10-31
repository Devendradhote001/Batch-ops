import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Card } from './Card';
import { Skeleton } from './Skeleton';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  loading?: boolean;
  className?: string;
}

export function StatCard({ label, value, hint, icon: Icon, loading, className }: StatCardProps) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        {Icon && <Icon className="size-4 text-zinc-400 dark:text-zinc-500" aria-hidden />}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-20" />
      ) : (
        <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      )}
      {hint && !loading && <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</div>}
    </Card>
  );
}
