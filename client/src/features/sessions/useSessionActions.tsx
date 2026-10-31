import { useState } from 'react';
import { toast } from 'sonner';
import type { Session } from '@batchops/shared';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getErrorMessage } from '@/lib/api';
import { formatDay } from '@/features/batches/meta';
import { useDeleteSession } from './api';
import { SessionFormModal } from './components/SessionFormModal';

interface LogOptions {
  batchId?: string;
  day?: string;
}

/**
 * Log / edit / delete flows for sessions, shared by every page that lists them.
 * Render `dialogs` once; call `log`, `edit` and `remove` from buttons.
 */
export function useSessionActions() {
  const [form, setForm] = useState<{ open: boolean; session?: Session } & LogOptions>({ open: false });
  const [deleting, setDeleting] = useState<Session | null>(null);
  const deleteSession = useDeleteSession();

  const confirmDelete = () => {
    if (!deleting) return;
    deleteSession.mutate(deleting._id, {
      onSuccess: () => {
        toast.success('Session deleted');
        setDeleting(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  const dialogs = (
    <>
      <SessionFormModal
        open={form.open}
        session={form.session}
        batchId={form.batchId}
        day={form.day}
        onClose={() => setForm({ open: false })}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteSession.isPending}
        tone="danger"
        title="Delete this session?"
        confirmLabel="Delete session"
        description={
          deleting && (
            <>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{deleting.title}</span> ({deleting.batch.code},{' '}
              {formatDay(deleting.day)}) will be removed and batch progress recalculated. This can't be undone.
            </>
          )
        }
      />
    </>
  );

  return {
    log: (options: LogOptions = {}) => setForm({ open: true, ...options }),
    edit: (session: Session) => setForm({ open: true, session }),
    remove: (session: Session) => setDeleting(session),
    dialogs,
  };
}
