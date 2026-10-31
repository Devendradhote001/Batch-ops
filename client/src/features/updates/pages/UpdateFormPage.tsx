import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CalendarClock } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { DAY_REGEX, UPDATE_STATUSES } from '@batchops/shared';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { useBatchOptions, useSessions } from '@/features/sessions/api';
import { SESSION_STATUS_META, SESSION_TYPE_META, formatDuration } from '@/features/sessions/meta';
import { getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { dayjs, todayIST } from '@/lib/day';
import { useSaveUpdate, useUpdate } from '../api';
import { ListEditor } from '../components/ListEditor';
import { UPDATE_STATUS_META } from '../meta';
import { toUpdateFormValues, updateFormSchema, type UpdateFormValues } from '../schemas';

/** The admin's end-of-day form. One update per day: this creates it or edits the existing one. */
export function UpdateFormPage() {
  const { day = '' } = useParams();
  const today = todayIST();
  const existing = useUpdate(day, DAY_REGEX.test(day) && day <= today);

  if (!DAY_REGEX.test(day) || day > today) return <Navigate to={`/updates/${today}/edit`} replace />;

  return (
    <>
      <Link
        to="/updates"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="size-4" /> Daily updates
      </Link>
      {existing.isPending ? (
        <Skeleton className="h-[32rem] rounded-lg" />
      ) : existing.isError ? (
        <Card>
          <ErrorState title="Couldn't load this update" error={existing.error} onRetry={() => existing.refetch()} />
        </Card>
      ) : (
        <UpdateForm key={day} day={day} isNew={!existing.data} defaults={toUpdateFormValues(existing.data ?? undefined)} />
      )}
    </>
  );
}

function UpdateForm({ day, isNew, defaults }: { day: string; isNew: boolean; defaults: UpdateFormValues }) {
  const navigate = useNavigate();
  const today = todayIST();
  const save = useSaveUpdate(day);
  const batches = useBatchOptions();

  const { register, handleSubmit, control, formState } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateFormSchema),
    defaultValues: defaults,
  });
  const { errors, isDirty } = formState;

  const onSubmit = handleSubmit((values) =>
    save.mutate(values, {
      onSuccess: () => {
        toast.success(isNew ? 'Update filed' : 'Update saved');
        navigate('/updates');
      },
    }),
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{isNew ? 'File daily update' : 'Edit daily update'}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {day === today ? 'Today, ' : ''}
            {dayjs(day).format('dddd, D MMMM YYYY')}
          </p>
        </div>
        <Field label="Date" htmlFor="update-day" className="w-40">
          <Input
            id="update-day"
            type="date"
            value={day}
            max={today}
            onChange={(e) => e.target.value && navigate(`/updates/${e.target.value}/edit`)}
          />
        </Field>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_20rem]">
        <form noValidate onSubmit={onSubmit} className="min-w-0 space-y-6">
          {save.isError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {getErrorMessage(save.error)}
            </p>
          )}

          <Card>
            <CardContent className="space-y-5">
              <Field label="How did the day go?" error={errors.status?.message}>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Status">
                      {UPDATE_STATUSES.map((s) => {
                        const meta = UPDATE_STATUS_META[s];
                        const selected = field.value === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => field.onChange(s)}
                            className={cn(
                              'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
                              selected
                                ? {
                                    'on-track': 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10',
                                    'at-risk': 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10',
                                    blocked: 'border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10',
                                  }[s]
                                : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50',
                            )}
                          >
                            <meta.icon
                              className={cn(
                                'mt-0.5 size-4 shrink-0',
                                { 'on-track': 'text-emerald-600', 'at-risk': 'text-amber-600', blocked: 'text-red-600' }[s],
                              )}
                            />
                            <span>
                              <span className="block text-sm font-medium">{meta.label}</span>
                              <span className="block text-xs text-zinc-500 dark:text-zinc-400">{meta.hint}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
              </Field>

              <Field label="Summary" htmlFor="summary" error={errors.summary?.message}>
                <Textarea
                  id="summary"
                  rows={5}
                  autoFocus
                  placeholder="What happened across the vertical today, in a few sentences."
                  invalid={!!errors.summary}
                  {...register('summary')}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <ListEditor name="highlights" label="Highlights" placeholder="A win worth noting" control={control} register={register} />
              <ListEditor name="blockers" label="Blockers" placeholder="Something in the way" control={control} register={register} />
              <ListEditor name="nextDayPlan" label="Plan for tomorrow" placeholder="Next step" control={control} register={register} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Batch notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {batches.isPending ? (
                <Skeleton className="h-20" />
              ) : !batches.data?.length ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No active batches.</p>
              ) : (
                batches.data.map((b) => (
                  <Field
                    key={b._id}
                    label={`${b.code} — ${b.name}`}
                    htmlFor={`note-${b._id}`}
                    error={errors.batchNotes?.[b._id]?.message}
                  >
                    <Textarea id={`note-${b._id}`} rows={2} placeholder="Optional" {...register(`batchNotes.${b._id}`)} />
                  </Field>
                ))
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => navigate('/updates')}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending} disabled={!isNew && !isDirty}>
              {isNew ? 'File update' : 'Save changes'}
            </Button>
          </div>
        </form>

        <DaySessions day={day} />
      </div>
    </>
  );
}

/** Read-only context: what was logged that day, to write the update against. */
function DaySessions({ day }: { day: string }) {
  const sessions = useSessions({ day });
  const items = sessions.data?.items ?? [];
  const taught = items.filter((s) => s.status === 'completed').reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <Card className="order-first xl:sticky xl:top-20 xl:order-none">
      <CardHeader>
        <CardTitle>Sessions that day</CardTitle>
        {items.length > 0 && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {items.length} logged · {formatDuration(taught)} taught
          </p>
        )}
      </CardHeader>
      {sessions.isPending ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No sessions logged" className="py-8" />
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {items.map((s) => {
            const Icon = SESSION_TYPE_META[s.type].icon;
            return (
              <li key={s._id} className="flex gap-3 px-5 py-3 text-sm">
                <Icon className="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden />
                <div className="min-w-0">
                  <p className={cn('truncate font-medium', s.status !== 'completed' && 'text-zinc-500 line-through')}>{s.title}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-mono">{s.batch.code}</span> · {s.instructor.name}
                    {s.status === 'completed'
                      ? ` · ${s.attendanceCount}/${s.batch.studentCount}`
                      : ` · ${SESSION_STATUS_META[s.status].label}`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
