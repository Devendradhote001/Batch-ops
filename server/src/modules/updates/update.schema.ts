import { z } from 'zod';
import { UPDATE_STATUSES } from '@batchops/shared';
import { daySchema, todayIST } from '../../utils/day';
import { paginationQuery } from '../../utils/pagination';
import { objectIdSchema, optionalParam } from '../../utils/validators';

const listItems = z.array(z.string().trim().max(300, 'Keep each point under 300 characters')).max(20)
  // Blank rows from the form are dropped rather than rejected.
  .transform((items) => items.filter(Boolean));

export const updateInputSchema = z.object({
  summary: z.string().trim().min(10, 'Write at least a sentence for the summary').max(4000),
  highlights: listItems.default([]),
  blockers: listItems.default([]),
  nextDayPlan: listItems.default([]),
  batchNotes: z
    .array(z.object({ batch: objectIdSchema, note: z.string().trim().max(1000) }))
    .max(50)
    .default([])
    .transform((notes) => notes.filter((n) => n.note)),
  status: z.enum(UPDATE_STATUSES),
});

export const dayParams = z.object({
  day: daySchema.refine((day) => day <= todayIST(), "Updates can't be filed for a future date"),
});

export const listUpdatesQuery = paginationQuery.extend({
  from: optionalParam(daySchema),
  to: optionalParam(daySchema),
  status: optionalParam(z.enum(UPDATE_STATUSES)),
  limit: z.coerce.number().int().min(1).max(60).default(10),
});

export type UpdateInput = z.infer<typeof updateInputSchema>;
export type ListUpdatesQuery = z.infer<typeof listUpdatesQuery>;
