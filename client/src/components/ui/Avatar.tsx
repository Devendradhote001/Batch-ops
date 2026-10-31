import { cn } from '@/lib/cn';

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase();
}

const sizes = {
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-xs',
  lg: 'size-12 text-base',
} as const;

interface AvatarProps {
  name: string;
  color?: string;
  size?: keyof typeof sizes;
  className?: string;
}

export function Avatar({ name, color = '#71717a', size = 'md', className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', sizes[size], className)}
      style={{ backgroundColor: color }}
    >
      {initials(name)}
    </span>
  );
}
