import { z } from 'zod';
import { EVENT_STATUSES, EVENT_TYPES, type VerticalEvent } from '@batchops/shared';
import { todayIST } from '@/lib/day';

const participants = z.number({ error: 'Enter a number' }).int('Use a whole number').min(0, "Can't be negative");
const outcomeNotes = z.string().max(4000, 'Keep it under 4000 characters');

export const eventFormSchema = z
  .object({
    title: z.string().trim().min(2, 'Give the event a title').max(160),
    day: z.string().min(1, 'Pick a date'),
    startTime: z.string(),
    endTime: z.string(),
    type: z.enum(EVENT_TYPES),
    batches: z.array(z.string()),
    leadBy: z.string().min(1, 'Choose who leads it'),
    coLeads: z.array(z.string()),
    description: z.string().max(4000, 'Keep it under 4000 characters'),
    location: z.string().max(300, 'Keep it under 300 characters'),
    status: z.enum(EVENT_STATUSES),
    outcomeNotes,
    participantCount: participants,
  })
  .refine((v) => !v.startTime || !v.endTime || v.endTime > v.startTime, {
    path: ['endTime'],
    message: 'End time must be after start time',
  })
  .refine((v) => v.status !== 'completed' || v.day <= todayIST(), {
    path: ['status'],
    message: "An event can't be completed before it happens",
  });

export const completeEventFormSchema = z.object({ outcomeNotes, participantCount: participants });

export type EventFormValues = z.infer<typeof eventFormSchema>;
export type CompleteEventFormValues = z.infer<typeof completeEventFormSchema>;

export function toEventFormValues(event?: VerticalEvent, day = ''): EventFormValues {
  if (!event) {
    return {
      title: '',
      day,
      startTime: '',
      endTime: '',
      type: 'workshop',
      batches: [],
      leadBy: '',
      coLeads: [],
      description: '',
      location: '',
      status: 'planned',
      outcomeNotes: '',
      participantCount: 0,
    };
  }
  return {
    title: event.title,
    day: event.day,
    startTime: event.startTime,
    endTime: event.endTime,
    type: event.type,
    batches: event.batches.map((b) => b._id),
    leadBy: event.leadBy._id,
    coLeads: event.coLeads.map((u) => u._id),
    description: event.description,
    location: event.location,
    status: event.status,
    outcomeNotes: event.outcomeNotes,
    participantCount: event.participantCount,
  };
}
