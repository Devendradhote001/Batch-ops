import { z } from 'zod';
import { addDays, daySchema, daysBetween, todayIST } from '../../utils/day';
import { objectIdSchema, optionalParam } from '../../utils/validators';

const MAX_RANGE_DAYS = 366;

/** Shared filters for every analytics endpoint. Defaults to the last 30 days. */
export const analyticsQuery = z
  .object({
    from: optionalParam(daySchema),
    to: optionalParam(daySchema),
    batch: optionalParam(objectIdSchema),
    instructor: optionalParam(objectIdSchema),
  })
  .transform((q) => {
    const to = q.to ?? todayIST();
    return { ...q, to, from: q.from ?? addDays(to, -29) };
  })
  .refine((q) => q.from <= q.to, { path: ['from'], message: 'From must be on or before To' })
  .refine((q) => daysBetween(q.from, q.to) < MAX_RANGE_DAYS, { path: ['from'], message: 'Pick a range of at most a year' });

export type AnalyticsFilters = z.infer<typeof analyticsQuery>;
