import { z } from 'zod';
import { EVENT_STATUSES, EVENT_TYPES } from '@batchops/shared';
import { daySchema, todayIST } from '../../utils/day';
import { paginationQuery } from '../../utils/pagination';
import { objectIdSchema, optionalParam, timeSchema } from '../../utils/validators';

const optionalTime = z.union([z.literal(''), timeSchema]).default('');
const outcomeFields = {
  outcomeNotes: z.string().trim().max(4000).default(''),
  participantCount: z.number().int().min(0).max(100_000).default(0),
};

/** Full set of event fields — used for both create (POST) and edit (PUT). */
export const eventInputSchema = z
  .object({
    title: z.string().trim().min(2, 'Title must be at least 2 characters').max(160),
    day: daySchema,
    startTime: optionalTime,
    endTime: optionalTime,
    type: z.enum(EVENT_TYPES),
    batches: z.array(objectIdSchema).max(50).default([]),
    leadBy: objectIdSchema,
    coLeads: z.array(objectIdSchema).max(20).default([]),
    description: z.string().trim().max(4000).default(''),
    location: z.string().trim().max(300).default(''),
    status: z.enum(EVENT_STATUSES).default('planned'),
    ...outcomeFields,
  })
  .refine((v) => !v.startTime || !v.endTime || v.endTime > v.startTime, {
    path: ['endTime'],
    message: 'End time must be after start time',
  })
  .refine((v) => v.status !== 'completed' || v.day <= todayIST(), {
    path: ['status'],
    message: "An event can't be completed before it happens",
  });

export const completeEventSchema = z.object(outcomeFields);

export const listEventsQuery = paginationQuery.extend({
  from: optionalParam(daySchema),
  to: optionalParam(daySchema),
  type: optionalParam(z.enum(EVENT_TYPES)),
  status: optionalParam(z.enum(EVENT_STATUSES)),
  batch: optionalParam(objectIdSchema),
  /** Lead or co-lead. */
  leader: optionalParam(objectIdSchema),
  sort: z.enum(['asc', 'desc']).default('asc'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type EventInput = z.infer<typeof eventInputSchema>;
export type CompleteEventInput = z.infer<typeof completeEventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuery>;
