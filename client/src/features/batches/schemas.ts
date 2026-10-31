import { z } from 'zod';
import { BATCH_STATUSES, type Batch } from '@batchops/shared';

const wholeNumber = (min: number, minMessage: string) =>
  z.number({ error: 'Enter a number' }).int('Use a whole number').min(min, minMessage);

export const batchFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9][A-Za-z0-9-]{1,29}$/, '2–30 letters, numbers or dashes (e.g. MERN-OCT-26)'),
    description: z.string().max(1000, 'Keep it under 1000 characters'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    status: z.enum(BATCH_STATUSES),
    leadInstructor: z.string().min(1, 'Choose a lead instructor'),
    instructors: z.array(z.string()),
    studentCount: wholeNumber(0, "Can't be negative"),
    totalPlannedSessions: wholeNumber(1, 'Plan at least 1 session'),
    schedule: z.object({
      days: z.array(z.number()).min(1, 'Pick at least one day'),
      startTime: z.string().min(1, 'Required'),
      endTime: z.string().min(1, 'Required'),
    }),
    modules: z.array(
      z.object({
        _id: z.string().optional(),
        title: z.string().trim().min(1, 'Module title is required').max(120),
        isCompleted: z.boolean(),
      }),
    ),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
    path: ['endDate'],
    message: 'End date must be on or after the start date',
  })
  .refine((v) => !v.schedule.startTime || !v.schedule.endTime || v.schedule.endTime > v.schedule.startTime, {
    path: ['schedule', 'endTime'],
    message: 'End time must be after start time',
  });

export type BatchFormValues = z.infer<typeof batchFormSchema>;

export function toFormValues(batch?: Batch): BatchFormValues {
  if (!batch) {
    return {
      name: '',
      code: '',
      description: '',
      startDate: '',
      endDate: '',
      status: 'upcoming',
      leadInstructor: '',
      instructors: [],
      studentCount: 0,
      totalPlannedSessions: 60,
      schedule: { days: [1, 3, 5], startTime: '19:00', endTime: '21:00' },
      modules: [],
    };
  }
  return {
    name: batch.name,
    code: batch.code,
    description: batch.description,
    startDate: batch.startDate,
    endDate: batch.endDate,
    status: batch.status,
    leadInstructor: batch.leadInstructor._id,
    instructors: batch.instructors.map((u) => u._id),
    studentCount: batch.studentCount,
    totalPlannedSessions: batch.totalPlannedSessions,
    schedule: { ...batch.schedule },
    modules: batch.modules.map(({ _id, title, isCompleted }) => ({ _id, title, isCompleted })),
  };
}
