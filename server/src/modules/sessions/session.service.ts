import { Types } from 'mongoose';
import type { AuthUser } from '../../types/express';
import { ApiError } from '../../utils/ApiError';
import { buildMeta, toSkip } from '../../utils/pagination';
import { logActivity } from '../activity/activity.service';
import { Batch } from '../batches/batch.model';
import { Session } from './session.model';
import type { ListSessionsQuery, SessionCalendarQuery, SessionInput } from './session.schema';

const TYPE_LABELS: Record<SessionInput['type'], string> = {
  lecture: 'a lecture',
  lab: 'a lab',
  doubt: 'a doubt session',
  test: 'a test',
  'project-review': 'a project review',
};

/**
 * Read scope: instructors see sessions of the batches they're assigned to (including co-instructors'),
 * admins and viewers see everything.
 */
async function visibilityFilter(user: AuthUser): Promise<Record<string, unknown>> {
  if (user.role !== 'instructor') return {};
  const batchIds = await Batch.find({ instructors: user.id }).distinct('_id');
  return { batch: { $in: batchIds } };
}

/** Filters shared by the list and the calendar. */
function queryConditions(query: Partial<ListSessionsQuery>) {
  const conditions: Record<string, unknown>[] = [];
  if (query.day) conditions.push({ day: query.day });
  if (query.from) conditions.push({ day: { $gte: query.from } });
  if (query.to) conditions.push({ day: { $lte: query.to } });
  if (query.batch) conditions.push({ batch: new Types.ObjectId(query.batch) });
  if (query.instructor) conditions.push({ instructor: new Types.ObjectId(query.instructor) });
  if (query.status) conditions.push({ status: query.status });
  if (query.type) conditions.push({ type: query.type });
  return conditions;
}

function populateSession<Q extends { populate: (path: string, select: string) => Q }>(query: Q) {
  return query
    .populate('batch', 'name code studentCount')
    .populate('instructor', 'name avatarColor role isActive')
    .populate('createdBy', 'name');
}

export async function listSessions(user: AuthUser, query: ListSessionsQuery) {
  const filter = { $and: [await visibilityFilter(user), ...queryConditions(query)] };
  const [items, total] = await Promise.all([
    populateSession(Session.find(filter))
      .sort({ day: -1, createdAt: -1 })
      .skip(toSkip(query))
      .limit(query.limit)
      .select('-__v')
      .lean(),
    Session.countDocuments(filter),
  ]);
  return { items, meta: buildMeta(query, total) };
}

/** Per-day session counts for a month, for the calendar view. */
export async function sessionCalendar(user: AuthUser, query: SessionCalendarQuery) {
  const match = {
    $and: [
      await visibilityFilter(user),
      ...queryConditions({ from: `${query.month}-01`, to: `${query.month}-31`, batch: query.batch, instructor: query.instructor }),
    ],
  };
  return Session.aggregate<{ day: string; count: number; completed: number; minutes: number }>([
    { $match: match },
    {
      $group: {
        _id: '$day',
        count: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        minutes: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$durationMinutes', 0] } },
      },
    },
    { $project: { _id: 0, day: '$_id', count: 1, completed: 1, minutes: 1 } },
    { $sort: { day: 1 } },
  ]);
}

export async function getSession(user: AuthUser, id: string) {
  const session = await populateSession(Session.findOne({ _id: id, ...(await visibilityFilter(user)) }))
    .select('-__v')
    .lean();
  if (!session) throw ApiError.notFound('Session not found');
  return session;
}

/** Loads the batch a session is being logged against and checks the user may log to it. */
async function batchForLogging(user: AuthUser, batchId: string) {
  const batch = await Batch.findById(batchId).select('code instructors isArchived');
  if (!batch) throw ApiError.badRequest('Batch not found');
  if (user.role === 'instructor' && !batch.instructors.some((id) => id.equals(user.id))) {
    throw ApiError.forbidden("You can only log sessions for batches you're assigned to");
  }
  if (batch.isArchived) throw ApiError.badRequest(`${batch.code} is archived. Restore it to log sessions.`);
  return batch;
}

/** Instructors always log as themselves. Admins may log for anyone assigned to the batch. */
function resolveInstructor(user: AuthUser, batch: Awaited<ReturnType<typeof batchForLogging>>, requested?: string) {
  if (user.role === 'instructor') return user.id;
  const instructorId = requested ?? user.id;
  if (!batch.instructors.some((id) => id.equals(instructorId))) {
    throw ApiError.badRequest(`The instructor must be assigned to ${batch.code}`);
  }
  return instructorId;
}

/** Admins can change any session; instructors only the ones they took. */
async function findEditableSession(user: AuthUser, id: string) {
  const session = await Session.findById(id);
  if (!session) throw ApiError.notFound('Session not found');
  if (user.role !== 'admin' && !session.instructor.equals(user.id)) {
    throw ApiError.forbidden('You can only change sessions you took');
  }
  return session;
}

export async function createSession(user: AuthUser, input: SessionInput) {
  const batch = await batchForLogging(user, input.batch);
  const session = await Session.create({
    ...input,
    instructor: resolveInstructor(user, batch, input.instructor),
    createdBy: user.id,
  });

  await logActivity({
    actor: user,
    action: 'created',
    entity: 'session',
    entityId: session._id,
    summary: `${user.name} logged ${TYPE_LABELS[session.type]} in ${batch.code}: ${session.title}`,
  });
  return getSession(user, session.id);
}

export async function updateSession(user: AuthUser, id: string, input: SessionInput) {
  const session = await findEditableSession(user, id);
  const batch = await batchForLogging(user, input.batch);

  session.set({ ...input, instructor: resolveInstructor(user, batch, input.instructor) });
  await session.save();

  await logActivity({
    actor: user,
    action: 'updated',
    entity: 'session',
    entityId: session._id,
    summary: `${user.name} updated a session in ${batch.code}: ${session.title}`,
  });
  return getSession(user, id);
}

export async function deleteSession(user: AuthUser, id: string) {
  const session = await findEditableSession(user, id);
  const batch = await Batch.findById(session.batch).select('code').lean();
  await session.deleteOne();

  await logActivity({
    actor: user,
    action: 'deleted',
    entity: 'session',
    entityId: session._id,
    summary: `${user.name} deleted a session from ${batch?.code ?? 'a batch'}: ${session.title}`,
  });
}
