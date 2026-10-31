import { cn } from '@/lib/cn';

interface ProgressBarProps {
  value: number;
  className?: string;
  label?: string;
}

export function ProgressBar({ value, className, label = 'Progress' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800', className)}
    >
      <div className="h-full rounded-full bg-accent-500 transition-[width] duration-500" style={{ width: `${clamped}%` }} />
    </div>
  );
}
