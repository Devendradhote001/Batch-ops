import { zodResolver } from '@hookform/resolvers/zod';
import { Crown, Plus, Trash2 } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { BATCH_STATUSES, type Batch, type UserSummary } from '@batchops/shared';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useUserOptions } from '@/features/users/api';
import { getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useSaveBatch } from '../api';
import { BATCH_STATUS_META, WEEKDAYS } from '../meta';
import { batchFormSchema, toFormValues, type BatchFormValues } from '../schemas';

interface BatchFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Edit this batch; omit to create one. */
  batch?: Batch;
  onSaved?: (batch: Batch) => void;
}

const FORM_ID = 'batch-form';

export function BatchFormModal({ open, onClose, batch, onSaved }: BatchFormModalProps) {
  const isEdit = !!batch;
  const save = useSaveBatch(batch?._id);
  const options = useUserOptions();

  const { register, handleSubmit, reset, control, watch, formState } = useForm<BatchFormValues>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: toFormValues(batch),
  });
  const { errors } = formState;
  const modules = useFieldArray({ control, name: 'modules', keyName: 'key' });

  useEffect(() => {
    if (open) {
      reset(toFormValues(batch));
      save.reset();
    }
  }, [open, batch]); // eslint-disable-line react-hooks/exhaustive-deps -- reset only when (re)opened

  // Keep deactivated instructors who are already on this batch visible, so they can be seen and removed.
  const people: UserSummary[] = [
    ...(options.data ?? []),
    ...(batch?.instructors.filter((u) => !options.data?.some((o) => o._id === u._id)) ?? []),
  ];
  const lead = watch('leadInstructor');

  const onSubmit = handleSubmit((values) => {
    save.mutate(
      { ...values, instructors: [...new Set([values.leadInstructor, ...values.instructors])] },
      {
        onSuccess: (saved) => {
          toast.success(isEdit ? 'Batch updated' : `${saved.code} created`);
          onSaved?.(saved);
          onClose();
        },
      },
    );
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? `Edit ${batch.code}` : 'New batch'}
      description={isEdit ? batch.name : 'Set up the batch, its team, schedule and syllabus.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={save.isPending}>
            {isEdit ? 'Save changes' : 'Create batch'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit} className="space-y-7">
        {save.isError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {getErrorMessage(save.error)}
          </p>
        )}

        <Section title="Basics">
          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
            <Field label="Batch name" htmlFor="name" error={errors.name?.message}>
              <Input id="name" placeholder="MERN Stack — October 2026" autoFocus invalid={!!errors.name} {...register('name')} />
            </Field>
            <Field label="Code" htmlFor="code" error={errors.code?.message}>
              <Input id="code" placeholder="MERN-OCT-26" className="font-mono uppercase" invalid={!!errors.code} {...register('code')} />
            </Field>
          </div>
          <Field label="Description" htmlFor="description" error={errors.description?.message}>
            <Textarea id="description" rows={2} placeholder="Optional — audience, goals, anything worth knowing." {...register('description')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Start date" htmlFor="startDate" error={errors.startDate?.message}>
              <Input id="startDate" type="date" invalid={!!errors.startDate} {...register('startDate')} />
            </Field>
            <Field label="End date" htmlFor="endDate" error={errors.endDate?.message}>
              <Input id="endDate" type="date" invalid={!!errors.endDate} {...register('endDate')} />
            </Field>
            <Field label="Status" htmlFor="status">
              <Select id="status" {...register('status')}>
                {BATCH_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {BATCH_STATUS_META[s].label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Section>

        <Section title="Team">
          <Field label="Lead instructor" htmlFor="leadInstructor" error={errors.leadInstructor?.message}>
            <Select id="leadInstructor" invalid={!!errors.leadInstructor} disabled={options.isPending} {...register('leadInstructor')}>
              <option value="">{options.isPending ? 'Loading…' : 'Choose a lead'}</option>
              {people.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                  {u.isActive === false ? ' (deactivated)' : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Co-instructors" hint="The lead is always included.">
            <Controller
              control={control}
              name="instructors"
              render={({ field }) =>
                people.length === 0 && !options.isPending ? (
                  <p className="text-sm text-zinc-500">No instructors yet. Add them from Admin → Users.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {people.map((u) => {
                      const isLead = u._id === lead;
                      const checked = isLead || field.value.includes(u._id);
                      return (
                        <label
                          key={u._id}
                          className={cn(
                            'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors',
                            checked
                              ? 'border-accent-300 bg-accent-50/60 dark:border-accent-500/40 dark:bg-accent-500/10'
                              : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50',
                            isLead && 'cursor-default',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="size-4 accent-accent-600"
                            checked={checked}
                            disabled={isLead}
                            onChange={(e) =>
                              field.onChange(e.target.checked ? [...field.value, u._id] : field.value.filter((id) => id !== u._id))
                            }
                          />
                          <Avatar name={u.name} color={u.avatarColor} size="sm" />
                          <span className={cn('truncate', u.isActive === false && 'text-zinc-400 line-through')}>{u.name}</span>
                          {isLead && <Crown className="ml-auto size-3.5 text-amber-500" aria-label="Lead" />}
                        </label>
                      );
                    })}
                  </div>
                )
              }
            />
          </Field>
        </Section>

        <Section title="Plan & schedule">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Students" htmlFor="studentCount" error={errors.studentCount?.message}>
              <Input id="studentCount" type="number" min={0} inputMode="numeric" invalid={!!errors.studentCount} {...register('studentCount', { valueAsNumber: true })} />
            </Field>
            <Field label="Planned sessions" htmlFor="totalPlannedSessions" error={errors.totalPlannedSessions?.message} hint="Used for the progress percentage.">
              <Input
                id="totalPlannedSessions"
                type="number"
                min={1}
                inputMode="numeric"
                invalid={!!errors.totalPlannedSessions}
                {...register('totalPlannedSessions', { valueAsNumber: true })}
              />
            </Field>
          </div>
          <Field label="Class days" error={errors.schedule?.days?.message}>
            <Controller
              control={control}
              name="schedule.days"
              render={({ field }) => (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Class days">
                  {WEEKDAYS.map((d) => {
                    const on = field.value.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        aria-pressed={on}
                        onClick={() => field.onChange(on ? field.value.filter((v) => v !== d.value) : [...field.value, d.value])}
                        className={cn(
                          'h-8 w-12 rounded-lg border text-sm font-medium transition-colors',
                          on
                            ? 'border-accent-600 bg-accent-600 text-white dark:border-accent-500 dark:bg-accent-500'
                            : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800',
                        )}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Starts at (IST)" htmlFor="startTime" error={errors.schedule?.startTime?.message}>
              <Input id="startTime" type="time" invalid={!!errors.schedule?.startTime} {...register('schedule.startTime')} />
            </Field>
            <Field label="Ends at (IST)" htmlFor="endTime" error={errors.schedule?.endTime?.message}>
              <Input id="endTime" type="time" invalid={!!errors.schedule?.endTime} {...register('schedule.endTime')} />
            </Field>
          </div>
        </Section>

        <Section
          title="Syllabus"
          action={
            <Button variant="secondary" size="sm" onClick={() => modules.append({ title: '', isCompleted: false })}>
              <Plus className="size-3.5" /> Add module
            </Button>
          }
        >
          {modules.fields.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              No modules yet. Add the syllabus to track completion.
            </p>
          ) : (
            <ol className="space-y-2">
              {modules.fields.map((m, index) => (
                <li key={m.key} className="flex items-start gap-2">
                  <span className="flex h-9 w-6 shrink-0 items-center justify-center text-xs text-zinc-400 tabular-nums">
                    {index + 1}.
                  </span>
                  <Field error={errors.modules?.[index]?.title?.message} className="flex-1">
                    <Input
                      placeholder="Module title"
                      aria-label={`Module ${index + 1} title`}
                      invalid={!!errors.modules?.[index]?.title}
                      {...register(`modules.${index}.title`)}
                    />
                  </Field>
                  <Button variant="ghost" size="icon" aria-label={`Remove module ${index + 1}`} onClick={() => modules.remove(index)}>
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </form>
    </Modal>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
