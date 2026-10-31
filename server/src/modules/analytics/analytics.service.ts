import { Types } from 'mongoose';
import { EVENT_TYPES, SESSION_STATUSES, UPDATE_STATUSES } from '@batchops/shared';
import type { AuthUser } from '../../types/express';
import { addDays, daysBetween, startOfWeek, todayIST } from '../../utils/day';
import { Batch } from '../batches/batch.model';
import { Event } from '../events/event.model';
import { Session } from '../sessions/session.model';
import { DailyUpdate } from '../updates/update.model';
import { User } from '../users/user.model';
import type { AnalyticsFilters } from './analytics.schema';

/**
 * All analytics are MongoDB aggregations over the filtered range; nothing is fetched wholesale.
 * Time series come back "pivoted" for charting: one row per bucket, one numeric column per series key,
 * with empty buckets filled with 0 so lines and bars don't skip weeks.
 */

const oid = (id: string) => new Types.ObjectId(id);

/** Instructors only ever see their own numbers, whatever they ask for. */
export function scopeFilters(user: AuthUser, filters: AnalyticsFilters): AnalyticsFilters {
  return user.role === 'instructor' ? { ...filters, instructor: user.id } : filters;
}

function sessionMatch(f: AnalyticsFilters, extra: Record<string, unknown> = {}) {
  return {
    day: { $gte: f.from, $lte: f.to },
    ...(f.batch && { batch: oid(f.batch) }),
    ...(f.instructor && { instructor: oid(f.instructor) }),
    ...extra,
  };
}

function eventMatch(f: AnalyticsFilters, extra: Record<string, unknown> = {}) {
  return {
    day: { $gte: f.from, $lte: f.to },
    ...(f.batch && { batches: oid(f.batch) }),
    ...(f.instructor && { $or: [{ leadBy: oid(f.instructor) }, { coLeads: oid(f.instructor) }] }),
    ...extra,
  };
}

function batchMatch(f: AnalyticsFilters) {
  return {
    isArchived: false,
    ...(f.batch && { _id: oid(f.batch) }),
    ...(f.instructor && { instructors: oid(f.instructor) }),
  };
}

/** Monday of each week touching the range, as YYYY-MM-DD. */
function weeksIn(f: AnalyticsFilters) {
  const weeks: string[] = [];
  for (let w = startOfWeek(f.from); w <= f.to; w = addDays(w, 7)) weeks.push(w);
  return weeks;
}

function monthsIn(f: AnalyticsFilters) {
  const months: string[] = [];
  for (let m = f.from.slice(0, 7); m <= f.to.slice(0, 7); m = addDays(`${m}-01`, 32).slice(0, 7)) months.push(m);
  return months;
}

/** IST day string → the Monday of its week, inside an aggregation. */
const WEEK_OF_DAY = {
  $dateToString: {
    format: '%Y-%m-%d',
    date: { $dateTrunc: { date: { $dateFromString: { dateString: '$day' } }, unit: 'week', startOfWeek: 'monday' } },
  },
};

const round1 = (n: number) => Math.round(n * 10) / 10;

interface SeriesPoint {
  bucket: string;
  key: string;
  value: number;
}

/**
 * Turns long-format points into chart rows: [{ bucket, [key]: value, … }], every key present in every row.
 * `empty` fills buckets with no data — 0 for counts, null for averages (a gap, not a zero).
 */
function pivot(buckets: string[], keys: string[], points: SeriesPoint[], bucketName = 'week', empty: number | null = 0) {
  const byBucket = new Map(
    buckets.map((b) => [b, Object.fromEntries(keys.map((k) => [k, empty])) as Record<string, number | null>]),
  );
  for (const p of points) {
    const row = byBucket.get(p.bucket);
    if (row && p.key in row) row[p.key] = p.value;
  }
  return buckets.map((b) => ({ [bucketName]: b, ...byBucket.get(b) }));
}

/** Rate of attendance for a completed session, capped at 100% (guests can push it over). */
const ATTENDANCE_RATE = {
  $cond: [
    { $gt: ['$studentCount', 0] },
    { $min: [{ $divide: ['$attendanceCount', '$studentCount'] }, 1] },
    null,
  ],
};

const WITH_STUDENT_COUNT = [
  { $lookup: { from: 'batches', localField: 'batch', foreignField: '_id', as: 'b', pipeline: [{ $project: { studentCount: 1 } }] } },
  { $set: { studentCount: { $first: '$b.studentCount' } } },
];

/** Consecutive filed days ending today — or yesterday, while today's update isn't due yet. */
async function currentUpdateStreak() {
  const today = todayIST();
  const days = new Set(
    (await DailyUpdate.find({ day: { $gte: addDays(today, -400) } }).select('day').lean()).map((u) => u.day),
  );
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export async function kpis(user: AuthUser, f: AnalyticsFilters) {
  const [sessionTotals] = await Session.aggregate<{ sessions: number; minutes: number; avgRate: number | null }>([
    { $match: sessionMatch(f, { status: 'completed' }) },
    ...WITH_STUDENT_COUNT,
    { $group: { _id: null, sessions: { $sum: 1 }, minutes: { $sum: '$durationMinutes' }, avgRate: { $avg: ATTENDANCE_RATE } } },
  ]);

  const [activeBatches, eventsConducted, updateStreak] = await Promise.all([
    Batch.countDocuments({ ...batchMatch(f), status: 'active' }),
    Event.countDocuments(eventMatch(f, { status: 'completed' })),
    user.role === 'instructor' ? null : currentUpdateStreak(),
  ]);

  return {
    activeBatches,
    sessions: sessionTotals?.sessions ?? 0,
    teachingHours: round1((sessionTotals?.minutes ?? 0) / 60),
    avgAttendance: sessionTotals?.avgRate == null ? null : Math.round(sessionTotals.avgRate * 100),
    eventsConducted,
    updateStreak,
  };
}

/** Completed vs planned sessions per batch. Progress is cumulative, so this ignores the date range. */
export async function batchProgress(f: AnalyticsFilters) {
  const batches = await Batch.find(batchMatch(f)).select('name code status totalPlannedSessions').sort({ startDate: 1 }).lean();
  const counts = await Session.aggregate<{ _id: Types.ObjectId; completed: number }>([
    { $match: { batch: { $in: batches.map((b) => b._id) }, status: 'completed' } },
    { $group: { _id: '$batch', completed: { $sum: 1 } } },
  ]);
  const completedByBatch = new Map(counts.map((c) => [String(c._id), c.completed]));

  return batches.map((b) => {
    const completed = completedByBatch.get(String(b._id)) ?? 0;
    return {
      batchId: String(b._id),
      code: b.code,
      name: b.name,
      status: b.status,
      completed,
      planned: b.totalPlannedSessions,
      progress: Math.min(100, Math.round((completed / b.totalPlannedSessions) * 100)),
    };
  });
}

async function batchSeries(ids: string[]) {
  const batches = await Batch.find({ _id: { $in: ids } }).select('code name').sort({ code: 1 }).lean();
  return batches.map((b) => ({ key: String(b._id), label: b.code, name: b.name }));
}

/** Completed sessions per week, one series per batch. */
export async function sessionsOverTime(f: AnalyticsFilters) {
  const points = await Session.aggregate<SeriesPoint>([
    { $match: sessionMatch(f, { status: 'completed' }) },
    { $group: { _id: { week: WEEK_OF_DAY, batch: '$batch' }, value: { $sum: 1 } } },
    { $project: { _id: 0, bucket: '$_id.week', key: { $toString: '$_id.batch' }, value: 1 } },
  ]);
  const series = await batchSeries([...new Set(points.map((p) => p.key))]);
  return { series, rows: pivot(weeksIn(f), series.map((s) => s.key), points) };
}

/** Average weekly attendance %, one series per batch. */
export async function attendanceTrend(f: AnalyticsFilters) {
  const points = await Session.aggregate<SeriesPoint>([
    { $match: sessionMatch(f, { status: 'completed' }) },
    ...WITH_STUDENT_COUNT,
    { $group: { _id: { week: WEEK_OF_DAY, batch: '$batch' }, rate: { $avg: ATTENDANCE_RATE } } },
    { $project: { _id: 0, bucket: '$_id.week', key: { $toString: '$_id.batch' }, value: { $round: [{ $multiply: ['$rate', 100] }, 0] } } },
  ]);
  const series = await batchSeries([...new Set(points.map((p) => p.key))]);
  // Weeks without sessions are gaps, not 0% attendance.
  return { series, rows: pivot(weeksIn(f), series.map((s) => s.key), points, 'week', null) };
}

/** Sessions and teaching hours per instructor per week (two pivots — never one dual-axis chart). */
export async function instructorWorkload(f: AnalyticsFilters) {
  const points = await Session.aggregate<{ week: string; key: string; sessions: number; minutes: number }>([
    { $match: sessionMatch(f, { status: 'completed' }) },
    { $group: { _id: { week: WEEK_OF_DAY, instructor: '$instructor' }, sessions: { $sum: 1 }, minutes: { $sum: '$durationMinutes' } } },
    { $project: { _id: 0, week: '$_id.week', key: { $toString: '$_id.instructor' }, sessions: 1, minutes: 1 } },
  ]);
  const users = await User.find({ _id: { $in: [...new Set(points.map((p) => p.key))] } }).select('name').sort({ name: 1 }).lean();
  const series = users.map((u) => ({ key: String(u._id), label: u.name }));
  const keys = series.map((s) => s.key);
  const weeks = weeksIn(f);

  return {
    series,
    sessions: pivot(weeks, keys, points.map((p) => ({ bucket: p.week, key: p.key, value: p.sessions }))),
    hours: pivot(weeks, keys, points.map((p) => ({ bucket: p.week, key: p.key, value: round1(p.minutes / 60) }))),
  };
}

export async function sessionStatus(f: AnalyticsFilters) {
  const counts = await Session.aggregate<{ _id: string; count: number }>([
    { $match: sessionMatch(f) },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const byStatus = new Map(counts.map((c) => [c._id, c.count]));
  return SESSION_STATUSES.map((status) => ({ status, count: byStatus.get(status) ?? 0 }));
}

/** Events per month by type, and how many events each person led or co-led. Cancelled events are excluded. */
export async function eventsBreakdown(f: AnalyticsFilters) {
  const match = eventMatch(f, { status: { $ne: 'cancelled' } });
  const [byMonth, byPerson] = await Promise.all([
    Event.aggregate<SeriesPoint>([
      { $match: match },
      { $group: { _id: { month: { $substrBytes: ['$day', 0, 7] }, type: '$type' }, value: { $sum: 1 } } },
      { $project: { _id: 0, bucket: '$_id.month', key: '$_id.type', value: 1 } },
    ]),
    Event.aggregate<{ _id: Types.ObjectId; led: number; coLed: number }>([
      { $match: match },
      {
        $project: {
          people: { $concatArrays: [[{ user: '$leadBy', role: 'led' }], { $map: { input: '$coLeads', as: 'c', in: { user: '$$c', role: 'coLed' } } }] },
        },
      },
      { $unwind: '$people' },
      ...(f.instructor ? [{ $match: { 'people.user': oid(f.instructor) } }] : []),
      {
        $group: {
          _id: '$people.user',
          led: { $sum: { $cond: [{ $eq: ['$people.role', 'led'] }, 1, 0] } },
          coLed: { $sum: { $cond: [{ $eq: ['$people.role', 'coLed'] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const types = EVENT_TYPES.filter((t) => byMonth.some((p) => p.key === t));
  const users = await User.find({ _id: { $in: byPerson.map((p) => p._id) } }).select('name').lean();
  const names = new Map(users.map((u) => [String(u._id), u.name]));

  return {
    types,
    byMonth: pivot(monthsIn(f), types, byMonth, 'month'),
    byPerson: byPerson
      .map((p) => ({ userId: String(p._id), name: names.get(String(p._id)) ?? 'Unknown', led: p.led, coLed: p.coLed }))
      .sort((a, b) => b.led + b.coLed - (a.led + a.coLed) || a.name.localeCompare(b.name)),
  };
}

/** Daily-update discipline over the range. Updates are vertical-wide, so batch/instructor filters don't apply. */
export async function updateConsistency(f: AnalyticsFilters) {
  const today = todayIST();
  const end = f.to < today ? f.to : today;
  const updates = await DailyUpdate.find({ day: { $gte: f.from, $lte: end } }).select('day status').lean();
  const byDay = new Map(updates.map((u) => [u.day, u.status]));

  const days: { day: string; status: string | null }[] = [];
  for (let d = f.from; d <= end; d = addDays(d, 1)) days.push({ day: d, status: byDay.get(d) ?? null });

  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.status ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // Today isn't "missed" until the day is over.
  const dueDays = end === today && !byDay.has(today) ? days.length - 1 : days.length;

  return {
    days,
    filed: updates.length,
    missed: Math.max(0, dueDays - updates.length),
    totalDays: Math.max(0, daysBetween(f.from, end) + 1),
    currentStreak: await currentUpdateStreak(),
    longestStreak: longest,
    distribution: UPDATE_STATUSES.map((status) => ({ status, count: updates.filter((u) => u.status === status).length })),
  };
}
