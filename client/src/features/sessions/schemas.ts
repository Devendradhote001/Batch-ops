import { z } from 'zod';
import { SESSION_STATUSES, SESSION_TYPES, type Session } from '@batchops/shared';
import { todayIST } from '@/lib/day';

const wholeNumber = (max: number) =>
  z.number({ error: 'Enter a number' }).int('Use a whole number').min(0, "Can't be negative").max(max, `At most ${max}`);

export const sessionFormSchema = z.object({
  batch: z.string().min(1, 'Choose a batch'),
  day: z
    .string()
    .min(1, 'Pick a date')
    .refine((day) => day <= todayIST(), "Sessions can't be logged for a future date"),
  title: z.string().trim().min(2, 'Give the session a title').max(160),
  topic: z.string().trim().max(160),
  /** Admins pick; empty for instructors (the server logs them as themselves). */
  instructor: z.string(),
  type: z.enum(SESSION_TYPES),
  durationMinutes: wholeNumber(720),
  attendanceCount: wholeNumber(10_000),
  status: z.enum(SESSION_STATUSES),
  notes: z.string().max(2000, 'Keep notes under 2000 characters'),
  recordingLink: z.union([
    z.literal(''),
    z.url({ protocol: /^https?$/, error: 'Enter a full link starting with https://' }),
  ]),
});

export type SessionFormValues = z.infer<typeof sessionFormSchema>;

export function toSessionFormValues(session: Session | undefined, defaults: { batch?: string; day: string }): SessionFormValues {
  if (session) {
    return {
      batch: session.batch._id,
      day: session.day,
      title: session.title,
      topic: session.topic,
      instructor: session.instructor._id,
      type: session.type,
      durationMinutes: session.durationMinutes,
      attendanceCount: session.attendanceCount,
      status: session.status,
      notes: session.notes,
      recordingLink: session.recordingLink,
    };
  }
  return {
    batch: defaults.batch ?? '',
    day: defaults.day,
    title: '',
    topic: '',
    instructor: '',
    type: 'lecture',
    durationMinutes: 120,
    attendanceCount: 0,
    status: 'completed',
    notes: '',
    recordingLink: '',
  };
}
