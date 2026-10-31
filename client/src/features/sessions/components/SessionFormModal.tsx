import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { SESSION_STATUSES, SESSION_TYPES, type Session } from '@batchops/shared';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAuthUser } from '@/features/auth/api';
import { getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { todayIST } from '@/lib/day';
import { useBatchOptions, useSaveSession } from '../api';
import { SESSION_STATUS_META, SESSION_TYPE_META, formatDuration } from '../meta';
import { canLogToBatch } from '../permissions';
import { sessionFormSchema, toSessionFormValues, type SessionFormValues } from '../schemas';

const DURATION_PRESETS = [60, 90, 120, 180];
const FORM_ID = 'session-form';

interface SessionFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Edit this session; omit to log a new one. */
  session?: Session;
  /** Pre-select (and lock) the batch, e.g. when logging from a batch page. */
  batchId?: string;
  /** Pre-fill the date, e.g. the day being viewed. */
  day?: string;
}

export function SessionFormModal({ open, onClose, session, batchId, day }: SessionFormModalProps) {
  const user = useAuthUser();
  const isAdmin = user.role === 'admin';
  const isEdit = !!session;
  const save = useSaveSession(session?._id);
  const batchOptions = useBatchOptions();
  const topicListId = useId();

  const { register, handleSubmit, reset, watch, setValue, formState } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: toSessionFormValues(session, { batch: batchId, day: day ?? todayIST() }),
  });
  const { errors } = formState;

  useEffect(() => {
    if (!open) return;
    const today = todayIST();
    reset(toSessionFormValues(session, { batch: batchId, day: day && day <= today ? day : today }));
    save.reset();
  }, [open, session, batchId, day]); // eslint-disable-line react-hooks/exhaustive-deps -- reset only when (re)opened

  // Only batches this user can log to.
  const batches = (batchOptions.data ?? []).filter((b) => canLogToBatch(user, b));
  const selectedBatchId = watch('batch');
  const selectedBatch = batches.find((b) => b._id === selectedBatchId);
  const instructorId = watch('instructor');
  const duration = watch('durationMinutes');
  const status = watch('status');

  // Admins log on behalf of a batch instructor: keep the choice valid when the batch changes.
  useEffect(() => {
    if (!isAdmin || !selectedBatch) return;
    if (selectedBatch.instructors.some((u) => u._id === instructorId)) return;
    const fallback = selectedBatch.instructors.find((u) => u._id === user._id) ?? selectedBatch.instructors[0];
    setValue('instructor', fallback?._id ?? '');
  }, [isAdmin, selectedBatch, instructorId, user._id, setValue]);

  const onSubmit = handleSubmit((values) =>
    save.mutate(values, {
      onSuccess: (saved) => {
        toast.success(isEdit ? 'Session updated' : `Session logged for ${saved.batch.code}`);
        onClose();
      },
    }),
  );

  const lockBatch = !!batchId && !isEdit;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit session' : 'Log a session'}
      description={isEdit ? `${session.batch.code} · ${session.title}` : 'Record what was taught, by whom, and how it went.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={save.isPending}>
            {isEdit ? 'Save changes' : 'Log session'}
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
          <Field label="Batch" htmlFor="batch" error={errors.batch?.message}>
            {lockBatch ? (
              // Read-only text rather than a disabled <select>: RHF drops disabled fields from submitted values.
              <Input
                id="batch"
                readOnly
                value={selectedBatch ? `${selectedBatch.code} — ${selectedBatch.name}` : 'Loading…'}
                className="bg-zinc-50 dark:bg-zinc-800/50"
              />
            ) : (
              <Select id="batch" invalid={!!errors.batch} {...register('batch')}>
                <option value="">{batchOptions.isPending ? 'Loading…' : 'Choose a batch'}</option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.code} — {b.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Date" htmlFor="day" error={errors.day?.message}>
            <Input id="day" type="date" max={todayIST()} invalid={!!errors.day} {...register('day')} />
          </Field>
        </div>
        {!batchOptions.isPending && batches.length === 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {isAdmin ? 'Create a batch first, then log sessions against it.' : "You're not assigned to any active batch yet."}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="title" error={errors.title?.message}>
            <Input id="title" placeholder="e.g. React hooks deep dive" autoFocus={!lockBatch || isEdit} invalid={!!errors.title} {...register('title')} />
          </Field>
          <Field label="Module / topic" htmlFor="topic" error={errors.topic?.message} hint={selectedBatch?.modules.length ? 'Pick a syllabus module or type your own.' : undefined}>
            <Input id="topic" list={topicListId} placeholder="Optional" {...register('topic')} />
            <datalist id={topicListId}>
              {selectedBatch?.modules.map((m) => <option key={m._id} value={m.title} />)}
            </datalist>
          </Field>
        </div>

        <div className={cn('grid gap-4', isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
          {isAdmin && (
            <Field label="Taken by" htmlFor="instructor" error={errors.instructor?.message}>
              <Select id="instructor" {...register('instructor')}>
                {!selectedBatch && <option value="">Choose a batch first</option>}
                {selectedBatch?.instructors.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                    {u._id === user._id ? ' (you)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Type" htmlFor="type">
            <Select id="type" {...register('type')}>
              {SESSION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SESSION_TYPE_META[t].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" {...register('status')}>
              {SESSION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {SESSION_STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Duration (minutes)" htmlFor="durationMinutes" error={errors.durationMinutes?.message}>
            <Input
              id="durationMinutes"
              type="number"
              min={0}
              step={15}
              inputMode="numeric"
              invalid={!!errors.durationMinutes}
              {...register('durationMinutes', { valueAsNumber: true })}
            />
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {DURATION_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setValue('durationMinutes', m, { shouldValidate: true })}
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-xs transition-colors',
                    duration === m
                      ? 'border-accent-300 bg-accent-50 text-accent-700 dark:border-accent-500/40 dark:bg-accent-500/10 dark:text-accent-300'
                      : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800',
                  )}
                >
                  {formatDuration(m)}
                </button>
              ))}
            </div>
          </Field>
          <Field
            label="Attendance"
            htmlFor="attendanceCount"
            error={errors.attendanceCount?.message}
            hint={
              status === 'cancelled'
                ? 'Leave at 0 for a cancelled session.'
                : selectedBatch
                  ? `${selectedBatch.studentCount} students enrolled`
                  : undefined
            }
          >
            <Input
              id="attendanceCount"
              type="number"
              min={0}
              inputMode="numeric"
              invalid={!!errors.attendanceCount}
              {...register('attendanceCount', { valueAsNumber: true })}
            />
          </Field>
        </div>

        <Field label="Notes" htmlFor="notes" error={errors.notes?.message}>
          <Textarea id="notes" rows={3} placeholder="What went well, what to follow up on, why it was cancelled…" {...register('notes')} />
        </Field>

        <Field label="Recording link" htmlFor="recordingLink" error={errors.recordingLink?.message}>
          <Input id="recordingLink" type="url" placeholder="https://… (optional)" invalid={!!errors.recordingLink} {...register('recordingLink')} />
        </Field>
      </form>
    </Modal>
  );
}
