import { z } from 'zod';
import { UPDATE_STATUSES, type DailyUpdate } from '@batchops/shared';

const listItem = z.object({ value: z.string().max(300, 'Keep each point under 300 characters') });

export const updateFormSchema = z.object({
  summary: z.string().trim().min(10, 'Write at least a sentence for the summary').max(4000),
  status: z.enum(UPDATE_STATUSES),
  // Field arrays need objects, so list rows are { value }.
  highlights: z.array(listItem),
  blockers: z.array(listItem),
  nextDayPlan: z.array(listItem),
  /** Keyed by batch id; blank notes are dropped on save. */
  batchNotes: z.record(z.string(), z.string().max(1000, 'Keep notes under 1000 characters')),
});

export type UpdateFormValues = z.infer<typeof updateFormSchema>;

const toRows = (items: string[]) => (items.length ? items : ['']).map((value) => ({ value }));
const fromRows = (rows: { value: string }[]) => rows.map((r) => r.value.trim()).filter(Boolean);

export function toUpdateFormValues(update?: DailyUpdate): UpdateFormValues {
  return {
    summary: update?.summary ?? '',
    status: update?.status ?? 'on-track',
    highlights: toRows(update?.highlights ?? []),
    blockers: toRows(update?.blockers ?? []),
    nextDayPlan: toRows(update?.nextDayPlan ?? []),
    batchNotes: Object.fromEntries(update?.batchNotes.map((n) => [n.batch._id, n.note]) ?? []),
  };
}

export function toUpdatePayload(values: UpdateFormValues) {
  return {
    summary: values.summary,
    status: values.status,
    highlights: fromRows(values.highlights),
    blockers: fromRows(values.blockers),
    nextDayPlan: fromRows(values.nextDayPlan),
    batchNotes: Object.entries(values.batchNotes)
      .map(([batch, note]) => ({ batch, note: note.trim() }))
      .filter((n) => n.note),
  };
}
