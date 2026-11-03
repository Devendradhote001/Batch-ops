import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { z } from 'zod';
import { APP_TIMEZONE, DAY_REGEX } from '@batchops/shared';

dayjs.extend(utc);
dayjs.extend(timezone);

const DAY_FORMAT = 'YYYY-MM-DD';

/** Today's date in IST as YYYY-MM-DD. The server is the source of truth for "today". */
export function todayIST(): string {
  return dayjs().tz(APP_TIMEZONE).format(DAY_FORMAT);
}

/** The IST calendar day an instant falls on. */
export function toDay(date: Date | string): string {
  return dayjs(date).tz(APP_TIMEZONE).format(DAY_FORMAT);
}

/** Shift a YYYY-MM-DD day by n calendar days. */
export function addDays(day: string, n: number): string {
  return dayjs.tz(day, APP_TIMEZONE).add(n, 'day').format(DAY_FORMAT);
}

/** The UTC instant at which an IST day starts. */
export function dayStartUTC(day: string): Date {
  return dayjs.tz(day, APP_TIMEZONE).startOf('day').toDate();
}

/** The Monday on or before a YYYY-MM-DD day. */
export function startOfWeek(day: string): string {
  const d = dayjs(day);
  return d.subtract((d.day() + 6) % 7, 'day').format(DAY_FORMAT);
}

/** Whole days from `from` to `to` (0 when equal). */
export function daysBetween(from: string, to: string): number {
  return dayjs(to).diff(dayjs(from), 'day');
}

/** The current moment in IST, formatted (e.g. for "generated at" stamps). */
export function formatNowIST(format = 'D MMM YYYY, h:mm A'): string {
  return dayjs().tz(APP_TIMEZONE).format(format);
}

/** A YYYY-MM-DD day formatted for people, e.g. "3 Nov 2026". */
export function formatDay(day: string, format = 'D MMM YYYY'): string {
  return dayjs(day).format(format);
}

/** "31 Oct" — for human-readable activity summaries. */
export function formatDayShort(day: string): string {
  return dayjs(day).format('D MMM');
}

export const daySchema = z
  .string()
  .regex(DAY_REGEX, 'Expected a date in YYYY-MM-DD format')
  // dayjs rolls impossible dates over (2026-02-30 → 2026-03-02), so a round trip catches them.
  .refine((value) => dayjs(value).format(DAY_FORMAT) === value, 'Invalid calendar date');
