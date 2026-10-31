import { cn } from '@/lib/cn';

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-7 shrink-0', className)}>
      <rect width="32" height="32" rx="8" className="fill-accent-600" />
      <path
        d="M9 9h8.5a4 4 0 0 1 0 8H9zM9 17h9.5a4 4 0 0 1 0 8H9z"
        fill="none"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
