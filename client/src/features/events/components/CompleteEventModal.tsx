import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { VerticalEvent } from '@batchops/shared';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/lib/api';
import { useCompleteEvent } from '../api';
import { completeEventFormSchema, type CompleteEventFormValues } from '../schemas';

const FORM_ID = 'complete-event-form';

export function CompleteEventModal({ event, onClose }: { event: VerticalEvent | null; onClose: () => void }) {
  const complete = useCompleteEvent();
  const { register, handleSubmit, reset, formState } = useForm<CompleteEventFormValues>({
    resolver: zodResolver(completeEventFormSchema),
  });
  const { errors } = formState;

  useEffect(() => {
    if (event) {
      reset({ outcomeNotes: event.outcomeNotes, participantCount: event.participantCount });
      complete.reset();
    }
  }, [event]); // eslint-disable-line react-hooks/exhaustive-deps -- reset only when (re)opened

  const onSubmit = handleSubmit((values) => {
    if (!event) return;
    complete.mutate(
      { id: event._id, ...values },
      {
        onSuccess: () => {
          toast.success(`"${event.title}" marked completed`);
          onClose();
        },
      },
    );
  });

  return (
    <Modal
      open={!!event}
      onClose={onClose}
      size="sm"
      title="Mark event completed"
      description={event?.title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={complete.isPending}>
            Mark completed
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit} className="space-y-4">
        {complete.isError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {getErrorMessage(complete.error)}
          </p>
        )}
        <Field label="Participants" htmlFor="participantCount" error={errors.participantCount?.message}>
          <Input
            id="participantCount"
            type="number"
            min={0}
            inputMode="numeric"
            autoFocus
            invalid={!!errors.participantCount}
            {...register('participantCount', { valueAsNumber: true })}
          />
        </Field>
        <Field label="Outcome" htmlFor="outcomeNotes" error={errors.outcomeNotes?.message}>
          <Textarea id="outcomeNotes" rows={4} placeholder="How it went, feedback, follow-ups…" {...register('outcomeNotes')} />
        </Field>
      </form>
    </Modal>
  );
}
