import { useState } from 'react';
import { toast } from 'sonner';
import type { VerticalEvent } from '@batchops/shared';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuthUser } from '@/features/auth/api';
import { getErrorMessage } from '@/lib/api';
import { useCancelEvent, useDeleteEvent } from './api';
import { CompleteEventModal } from './components/CompleteEventModal';
import { EventDetailModal } from './components/EventDetailModal';
import { EventFormModal } from './components/EventFormModal';

/**
 * View / create / edit / complete / cancel / delete flows for events, shared by every page that shows them.
 * Render `dialogs` once; call `open` and `create` from the page.
 */
export function useEventActions() {
  const isAdmin = useAuthUser().role === 'admin';
  const [viewing, setViewing] = useState<VerticalEvent | null>(null);
  const [form, setForm] = useState<{ open: boolean; event?: VerticalEvent; day?: string }>({ open: false });
  const [completing, setCompleting] = useState<VerticalEvent | null>(null);
  const [deleting, setDeleting] = useState<VerticalEvent | null>(null);
  const cancelEvent = useCancelEvent();
  const deleteEvent = useDeleteEvent();

  const onError = (error: unknown) => toast.error(getErrorMessage(error));

  const dialogs = (
    <>
      <EventDetailModal
        event={viewing}
        onClose={() => setViewing(null)}
        actions={
          isAdmin
            ? {
                onEdit: (e) => {
                  setViewing(null);
                  setForm({ open: true, event: e });
                },
                onComplete: (e) => {
                  setViewing(null);
                  setCompleting(e);
                },
                onCancel: (e) =>
                  cancelEvent.mutate(e, {
                    onSuccess: () => {
                      toast.success(`"${e.title}" cancelled`);
                      setViewing(null);
                    },
                    onError,
                  }),
                onDelete: (e) => {
                  setViewing(null);
                  setDeleting(e);
                },
                cancelling: cancelEvent.isPending,
              }
            : undefined
        }
      />
      {isAdmin && (
        <>
          <EventFormModal open={form.open} event={form.event} day={form.day} onClose={() => setForm({ open: false })} />
          <CompleteEventModal event={completing} onClose={() => setCompleting(null)} />
          <ConfirmDialog
            open={!!deleting}
            onClose={() => setDeleting(null)}
            onConfirm={() =>
              deleting &&
              deleteEvent.mutate(deleting._id, {
                onSuccess: () => {
                  toast.success('Event deleted');
                  setDeleting(null);
                },
                onError,
              })
            }
            loading={deleteEvent.isPending}
            tone="danger"
            title="Delete this event?"
            confirmLabel="Delete event"
            description={
              <>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{deleting?.title}</span> will be removed
                permanently. To keep a record that it didn't happen, cancel it instead.
              </>
            }
          />
        </>
      )}
    </>
  );

  return {
    open: (event: VerticalEvent) => setViewing(event),
    create: (day?: string) => setForm({ open: true, day }),
    dialogs,
  };
}
