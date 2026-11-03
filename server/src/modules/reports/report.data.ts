import type { Types } from 'mongoose';
import type { AuthUser } from '../../types/express';
import { todayIST } from '../../utils/day';
import type { AnalyticsFilters } from '../analytics/analytics.schema';
import * as analytics from '../analytics/analytics.service';
import { Batch } from '../batches/batch.model';
import { Event } from '../events/event.model';
import { Session } from '../sessions/session.model';
import { DailyUpdate } from '../updates/update.model';

type Named = { _id: Types.ObjectId; name: string } | null;
type Coded = { _id: Types.ObjectId; code: string; name?: string; studentCount?: number } | null;

export interface InstructorRow {
  name: string;
  sessions: number;
  hours: number;
  avgAttendance: number | null;
  eventsLed: number;
  eventsCoLed: number;
}

/**
 * Everything an export needs for one date range and filter set, gathered with the same filters and
 * calculations as the Analytics page so the numbers match. Batch/instructor filters apply to batches,
 * sessions and events; daily updates are vertical-wide.
 */
export async function gatherReport(user: AuthUser, filters: AnalyticsFilters) {
  const f = analytics.scopeFilters(user, filters);
  const end = f.to < todayIST() ? f.to : todayIST();

  const [kpis, progress, batches, sessions, events, updates, consistency] = await Promise.all([
    analytics.kpis(user, f),
    analytics.batchProgress(f),
    Batch.find(analytics.batchMatch(f))
      .populate<{ leadInstructor: Named }>('leadInstructor', 'name')
      .populate<{ instructors: Named[] }>('instructors', 'name')
      .sort({ startDate: 1 })
      .lean(),
    Session.find(analytics.sessionMatch(f))
      .populate<{ batch: Coded }>('batch', 'code name studentCount')
      .populate<{ instructor: Named }>('instructor', 'name')
      .sort({ day: 1, createdAt: 1 })
      .lean(),
    Event.find(analytics.eventMatch(f))
      .populate<{ batches: Coded[] }>('batches', 'code')
      .populate<{ leadBy: Named }>('leadBy', 'name')
      .populate<{ coLeads: Named[] }>('coLeads', 'name')
      .sort({ day: 1, startTime: 1 })
      .lean(),
    DailyUpdate.find({ day: { $gte: f.from, $lte: end } })
      .populate<{ batchNotes: { batch: Coded; note: string }[] }>('batchNotes.batch', 'code')
      .sort({ day: 1 })
      .lean(),
    user.role === 'instructor' ? null : analytics.updateConsistency(f),
  ]);

  const progressById = new Map(progress.map((p) => [p.batchId, p]));

  // Per-instructor totals for the range, from the same sessions and events listed in the report.
  const byPerson = new Map<string, InstructorRow & { rates: number[] }>();
  const row = (person: Named) => {
    const key = String(person!._id);
    if (!byPerson.has(key)) {
      byPerson.set(key, { name: person!.name, sessions: 0, hours: 0, avgAttendance: null, eventsLed: 0, eventsCoLed: 0, rates: [] });
    }
    return byPerson.get(key)!;
  };
  for (const s of sessions) {
    if (s.status !== 'completed' || !s.instructor) continue;
    const r = row(s.instructor);
    r.sessions += 1;
    r.hours += s.durationMinutes / 60;
    if (s.batch?.studentCount) r.rates.push(Math.min(1, s.attendanceCount / s.batch.studentCount));
  }
  for (const e of events) {
    if (e.status === 'cancelled') continue;
    if (e.leadBy) row(e.leadBy).eventsLed += 1;
    for (const c of e.coLeads) if (c) row(c).eventsCoLed += 1;
  }
  const instructors: InstructorRow[] = [...byPerson.values()]
    .map(({ rates, ...r }) => ({
      ...r,
      hours: Math.round(r.hours * 10) / 10,
      avgAttendance: rates.length ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) : null,
    }))
    .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));

  return {
    filters: f,
    generatedFor: user.name,
    kpis,
    batches: batches.map((b) => ({ ...b, progress: progressById.get(String(b._id)) })),
    sessions,
    events,
    updates,
    consistency,
    instructors,
  };
}

export type ReportData = Awaited<ReturnType<typeof gatherReport>>;
