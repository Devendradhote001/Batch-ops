import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { EVENT_STATUSES, EVENT_TYPES, type VerticalEvent } from '@batchops/shared';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useBatchOptions } from '@/features/sessions/api';
import { useUserOptions } from '@/features/users/api';
import { getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useSaveEvent } from '../api';
import { EVENT_STATUS_META, EVENT_TYPE_META } from '../meta';
import { eventFormSchema, toEventFormValues, type EventFormValues } from '../schemas';

interface EventFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Edit this event; omit to create one. */
  event?: VerticalEvent;
  /** Pre-fill the date for a new event. */
  day?: string;
}

const FORM_ID = 'event-form';

function CheckboxPill({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors',
        checked
          ? 'border-accent-300 bg-accent-50/60 dark:border-accent-500/40 dark:bg-accent-500/10'
          : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50',
      )}
    >
      <input type="checkbox" className="size-4 accent-accent-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

export function EventFormModal({ open, onClose, event, day }: EventFormModalProps) {
  const isEdit = !!event;
  const save = useSaveEvent(event?._id);
  const people = useUserOptions();
  const batches = useBatchOptions();

  const { register, handleSubmit, reset, control, watch, formState } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: toEventFormValues(event, day),
  });
  const { errors } = formState;

  useEffect(() => {
    if (open) {
      reset(toEventFormValues(event, day));
      save.reset();
    }
  }, [open, event, day]); // eslint-disable-line react-hooks/exhaustive-deps -- reset only when (re)opened

  // Keep people/batches already on the event visible even if since deactivated or archived.
  const leaders = [
    ...(people.data ?? []),
    ...[...(event ? [event.leadBy, ...event.coLeads] : [])].filter((u) => !people.data?.some((p) => p._id === u._id)),
  ];
  const batchChoices = [
    ...(batches.data ?? []),
    ...(event?.batches.filter((b) => !batches.data?.some((o) => o._id === b._id)) ?? []),
  ];
  const lead = watch('leadBy');
  const status = watch('status');

  const onSubmit = handleSubmit((values) =>
    save.mutate(values, {
      onSuccess: (saved) => {
        toast.success(isEdit ? 'Event updated' : `"${saved?.title}" scheduled`);
        onClose();
      },
    }),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit event' : 'New event'}
      description={isEdit ? event.title : 'Workshops, hackathons, talks and assessments for the vertical.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={save.isPending}>
            {isEdit ? 'Save changes' : 'Create event'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit} className="space-y-4">
        {save.isError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {getErrorMessage(save.error)}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
          <Field label="Title" htmlFor="title" error={errors.title?.message}>
            <Input id="title" autoFocus placeholder="e.g. React performance workshop" invalid={!!errors.title} {...register('title')} />
          </Field>
          <Field label="Type" htmlFor="type">
            <Select id="type" {...register('type')}>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EVENT_TYPE_META[t].label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-[1fr_8rem_8rem]">
          <Field label="Date" htmlFor="day" error={errors.day?.message} className="col-span-2 sm:col-span-1">
            <Input id="day" type="date" invalid={!!errors.day} {...register('day')} />
          </Field>
          <Field label="Starts (IST)" htmlFor="startTime">
            <Input id="startTime" type="time" {...register('startTime')} />
          </Field>
          <Field label="Ends (IST)" htmlFor="endTime" error={errors.endTime?.message}>
            <Input id="endTime" type="time" invalid={!!errors.endTime} {...register('endTime')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Led by" htmlFor="leadBy" error={errors.leadBy?.message}>
            <Select id="leadBy" invalid={!!errors.leadBy} {...register('leadBy')}>
              <option value="">{people.isPending ? 'Loading…' : 'Choose who leads it'}</option>
              {leaders.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                  {u.isActive === false ? ' (deactivated)' : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Location or link" htmlFor="location" error={errors.location?.message}>
            <Input id="location" placeholder="Lab 2, or https://meet…" {...register('location')} />
          </Field>
        </div>

        <Field label="Co-leads">
          <Controller
            control={control}
            name="coLeads"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {leaders
                  .filter((u) => u._id !== lead)
                  .map((u) => (
                    <CheckboxPill
                      key={u._id}
                      checked={field.value.includes(u._id)}
                      onChange={(on) => field.onChange(on ? [...field.value, u._id] : field.value.filter((id) => id !== u._id))}
                    >
                      <Avatar name={u.name} color={u.avatarColor} size="sm" />
                      {u.name}
                    </CheckboxPill>
                  ))}
                {leaders.length <= 1 && <p className="text-sm text-zinc-500 dark:text-zinc-400">No one else to add yet.</p>}
              </div>
            )}
          />
        </Field>

        <Field label="Batches" hint="Leave all unticked for a vertical-wide event.">
          <Controller
            control={control}
            name="batches"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {batchChoices.map((b) => (
                  <CheckboxPill
                    key={b._id}
                    checked={field.value.includes(b._id)}
                    onChange={(on) => field.onChange(on ? [...field.value, b._id] : field.value.filter((id) => id !== b._id))}
                  >
                    <span className="font-mono text-xs">{b.code}</span>
                  </CheckboxPill>
                ))}
                {batchChoices.length === 0 && !batches.isPending && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No active batches.</p>
                )}
              </div>
            )}
          />
        </Field>

        <Field label="Description" htmlFor="description" error={errors.description?.message}>
          <Textarea id="description" rows={3} placeholder="Agenda, speakers, what participants should prepare…" {...register('description')} />
        </Field>

        {isEdit && (
          <div className="grid gap-4 border-t border-zinc-100 pt-4 sm:grid-cols-2 dark:border-zinc-800">
            <Field label="Status" htmlFor="status" error={errors.status?.message}>
              <Select id="status" invalid={!!errors.status} {...register('status')}>
                {EVENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {EVENT_STATUS_META[s].label}
                  </option>
                ))}
              </Select>
            </Field>
            {status === 'completed' && (
              <>
                <Field label="Participants" htmlFor="participantCount" error={errors.participantCount?.message}>
                  <Input id="participantCount" type="number" min={0} inputMode="numeric" {...register('participantCount', { valueAsNumber: true })} />
                </Field>
                <Field label="Outcome" htmlFor="outcomeNotes" error={errors.outcomeNotes?.message} className="sm:col-span-2">
                  <Textarea id="outcomeNotes" rows={3} {...register('outcomeNotes')} />
                </Field>
              </>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
