import { z } from 'zod';
import { BATCH_STATUSES } from '@batchops/shared';
import { daySchema } from '../../utils/day';
import { paginationQuery } from '../../utils/pagination';
import { objectIdSchema, optionalParam, searchParam, timeSchema } from '../../utils/validators';

const moduleInput = z.object({
  /** Present for existing modules so their completion history is kept. */
  _id: objectIdSchema.optional(),
  title: z.string().trim().min(1, 'Module title is required').max(120),
  isCompleted: z.boolean().default(false),
});

/** Full set of editable batch fields — used for both create (POST) and edit (PUT). */
export const batchInputSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9-]{1,29}$/, 'Code must be 2–30 letters, numbers or dashes'),
    description: z.string().trim().max(1000).default(''),
    startDate: daySchema,
    endDate: daySchema,
    status: z.enum(BATCH_STATUSES),
    leadInstructor: objectIdSchema,
    instructors: z.array(objectIdSchema).max(20).default([]),
    studentCount: z.number().int().min(0).max(10_000),
    schedule: z.object({
      days: z.array(z.number().int().min(0).max(6)).min(1, 'Pick at least one day').max(7),
      startTime: timeSchema,
      endTime: timeSchema,
    }),
    totalPlannedSessions: z.number().int().min(1).max(1000),
    modules: z.array(moduleInput).max(100).default([]),
  })
  .refine((v) => v.endDate >= v.startDate, {
    path: ['endDate'],
    message: 'End date must be on or after the start date',
  })
  .refine((v) => v.schedule.endTime > v.schedule.startTime, {
    path: ['schedule', 'endTime'],
    message: 'End time must be after start time',
  });

export const listBatchesQuery = paginationQuery.extend({
  q: searchParam,
  status: optionalParam(z.enum(BATCH_STATUSES)),
  instructor: optionalParam(objectIdSchema),
  archived: z.enum(['false', 'true', 'all']).default('false'),
});

export const archiveBatchSchema = z.object({ isArchived: z.boolean() });

export const moduleParams = z.object({ id: objectIdSchema, moduleId: objectIdSchema });
export const toggleModuleSchema = z.object({ isCompleted: z.boolean() });

export type BatchInput = z.infer<typeof batchInputSchema>;
export type ListBatchesQuery = z.infer<typeof listBatchesQuery>;
