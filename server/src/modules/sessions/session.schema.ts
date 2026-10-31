import { z } from 'zod';
import { SESSION_STATUSES, SESSION_TYPES } from '@batchops/shared';
import { daySchema, todayIST } from '../../utils/day';
import { paginationQuery } from '../../utils/pagination';
import { objectIdSchema, optionalParam } from '../../utils/validators';

/** Full set of session fields — used for both create (POST) and edit (PUT). */
export const sessionInputSchema = z.object({
  batch: objectIdSchema,
  day: daySchema.refine((day) => day <= todayIST(), "Sessions can't be logged for a future date"),
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(160),
  topic: z.string().trim().max(160).default(''),
  /** Ignored for instructors — they always log as themselves. */
  instructor: objectIdSchema.optional(),
  type: z.enum(SESSION_TYPES),
  durationMinutes: z.number().int().min(0).max(12 * 60),
  attendanceCount: z.number().int().min(0).max(10_000).default(0),
  status: z.enum(SESSION_STATUSES),
  notes: z.string().trim().max(2000).default(''),
  recordingLink: z
    .union([z.literal(''), z.url({ protocol: /^https?$/, error: 'Recording link must be an http(s) URL' })])
    .default(''),
});

export const listSessionsQuery = paginationQuery.extend({
  day: optionalParam(daySchema),
  from: optionalParam(daySchema),
  to: optionalParam(daySchema),
  batch: optionalParam(objectIdSchema),
  instructor: optionalParam(objectIdSchema),
  status: optionalParam(z.enum(SESSION_STATUSES)),
  type: optionalParam(z.enum(SESSION_TYPES)),
});

export const sessionCalendarQuery = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected a month in YYYY-MM format'),
  batch: optionalParam(objectIdSchema),
  instructor: optionalParam(objectIdSchema),
});

export type SessionInput = z.infer<typeof sessionInputSchema>;
export type ListSessionsQuery = z.infer<typeof listSessionsQuery>;
export type SessionCalendarQuery = z.infer<typeof sessionCalendarQuery>;
