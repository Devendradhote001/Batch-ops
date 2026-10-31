import type { AuthUser } from '../../types/express';
import { addDays, todayIST } from '../../utils/day';
import { listRecentActivity } from '../activity/activity.service';
import { listBatches } from '../batches/batch.service';
import { listEvents } from '../events/event.service';
import { listSessions } from '../sessions/session.service';
import { DailyUpdate } from '../updates/update.model';
import { listUpdates } from '../updates/update.service';

/**
 * "Today at a glance" in one request. Built on the same scoped list services as the rest of the API,
 * so an instructor's dashboard only ever contains their batches, sessions and events.
 */
export async function getDashboard(user: AuthUser) {
  const today = todayIST();
  const canSeeUpdates = user.role !== 'instructor';

  const [sessionsToday, activeBatches, upcomingEvents, todaysUpdate, recentUpdates, recentActivity] = await Promise.all([
    listSessions(user, { day: today, page: 1, limit: 50 }),
    listBatches(user, { status: 'active', archived: 'false', page: 1, limit: 6 }),
    listEvents(user, { from: today, to: addDays(today, 7), status: 'planned', sort: 'asc', page: 1, limit: 6 }),
    canSeeUpdates ? DailyUpdate.findOne({ day: today }).select('day status').lean() : null,
    canSeeUpdates ? listUpdates({ page: 1, limit: 5 }) : null,
    canSeeUpdates ? listRecentActivity(12) : null,
  ]);

  return {
    today,
    sessionsToday: sessionsToday.items,
    activeBatches: { total: activeBatches.meta.total, items: activeBatches.items },
    upcomingEvents: { total: upcomingEvents.meta.total, items: upcomingEvents.items },
    todaysUpdate: canSeeUpdates ? { filed: !!todaysUpdate, status: todaysUpdate?.status ?? null } : null,
    recentUpdates: recentUpdates?.items ?? null,
    recentActivity,
  };
}
