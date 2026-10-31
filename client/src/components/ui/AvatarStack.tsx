import type { UserSummary } from '@batchops/shared';
import { Avatar } from './Avatar';

export function AvatarStack({ users, max = 4 }: { users: UserSummary[]; max?: number }) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;

  return (
    <div className="flex items-center -space-x-1.5" title={users.map((u) => u.name).join(', ')}>
      {shown.map((user) => (
        <Avatar key={user._id} name={user.name} color={user.avatarColor} size="sm" className="ring-2 ring-white dark:ring-zinc-900" />
      ))}
      {extra > 0 && (
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-medium text-zinc-600 ring-2 ring-white dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-900">
          +{extra}
        </span>
      )}
    </div>
  );
}
