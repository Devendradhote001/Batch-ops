import { Check, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import type { Batch } from '@batchops/shared';
import { EmptyState } from '@/components/ui/EmptyState';
import { getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { dayjs } from '@/lib/day';
import { useToggleModule } from '../api';

/** Syllabus modules. Admins can tick them off; everyone else sees read-only status. */
export function ModuleChecklist({ batch, editable }: { batch: Batch; editable: boolean }) {
  const toggle = useToggleModule(batch._id);
  const pendingId = toggle.isPending ? toggle.variables?.moduleId : undefined;

  if (batch.modules.length === 0) {
    return <EmptyState icon={ListChecks} title="No syllabus yet" description={editable ? 'Add modules by editing the batch.' : undefined} className="py-10" />;
  }

  return (
    <ol className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {batch.modules.map((m, index) => {
        const busy = pendingId === m._id;
        const content = (
          <>
            <span
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                m.isCompleted
                  ? 'border-accent-600 bg-accent-600 text-white dark:border-accent-500 dark:bg-accent-500'
                  : 'border-zinc-300 dark:border-zinc-700',
                busy && 'animate-pulse',
              )}
            >
              {m.isCompleted && <Check className="size-3.5" strokeWidth={3} />}
            </span>
            <span className="w-6 text-xs text-zinc-400 tabular-nums">{index + 1}.</span>
            <span className={cn('flex-1 text-left', m.isCompleted && 'text-zinc-500 line-through decoration-zinc-300 dark:text-zinc-400 dark:decoration-zinc-600')}>
              {m.title}
            </span>
            {m.isCompleted && m.completedAt && (
              <span className="hidden text-xs text-zinc-400 sm:inline">{dayjs(m.completedAt).format('D MMM')}</span>
            )}
          </>
        );

        return (
          <li key={m._id}>
            {editable ? (
              <button
                type="button"
                role="checkbox"
                aria-checked={m.isCompleted}
                disabled={busy}
                onClick={() =>
                  toggle.mutate(
                    { moduleId: m._id, isCompleted: !m.isCompleted },
                    { onError: (error) => toast.error(getErrorMessage(error)) },
                  )
                }
                className="flex w-full items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
              >
                {content}
              </button>
            ) : (
              <div className="flex items-center gap-3 px-5 py-2.5 text-sm">{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
