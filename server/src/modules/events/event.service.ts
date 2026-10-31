import { Types } from 'mongoose';
import type { AuthUser } from '../../types/express';
import { ApiError } from '../../utils/ApiError';
import { formatDayShort, todayIST } from '../../utils/day';
import { buildMeta, toSkip } from '../../utils/pagination';
import { logActivity } from '../activity/activity.service';
import { Batch } from '../batches/batch.model';
import { User } from '../users/user.model';
import { TEACHING_ROLES } from '../users/user.service';
import { Event } from './event.model';
import type { CompleteEventInput, EventInput, ListEventsQuery } from './event.schema';

function ledBy(userId: string) {
  const id = new Types.ObjectId(userId);
  return { $or: [{ leadBy: id }, { coLeads: id }] };
}

/** Instructors see the events they lead or co-lead; admins and viewers see all. */
function visibilityFilter(user: AuthUser): Record<string, unknown> {
  return user.role === 'instructor' ? ledBy(user.id) : {};
}

function populateEvent<Q extends { populate: (path: string, select: string) => Q }>(query: Q) {
  return query
    .populate('batches', 'name code')
    .populate('leadBy', 'name avatarColor role isActive')
    .populate('coLeads', 'name avatarColor role isActive');
}

export async function listEvents(user: AuthUser, query: ListEventsQuery) {
  const conditions: Record<string, unknown>[] = [visibilityFilter(user)];
  if (query.from) conditions.push({ day: { $gte: query.from } });
  if (query.to) conditions.push({ day: { $lte: query.to } });
  if (query.type) conditions.push({ type: query.type });
  if (query.status) conditions.push({ status: query.status });
  if (query.batch) conditions.push({ batches: new Types.ObjectId(query.batch) });
  if (query.leader) conditions.push(ledBy(query.leader));
  const filter = { $and: conditions };

  const direction = query.sort === 'asc' ? 1 : -1;
  const [items, total] = await Promise.all([
    populateEvent(Event.find(filter))
      .sort({ day: direction, startTime: direction, createdAt: direction })
      .skip(toSkip(query))
      .limit(query.limit)
      .select('-__v -createdBy')
      .lean(),
    Event.countDocuments(filter),
  ]);
  return { items, meta: buildMeta(query, total) };
}

export async function getEvent(user: AuthUser, id: string) {
  const event = await populateEvent(Event.findOne({ _id: id, ...visibilityFilter(user) }))
    .select('-__v -createdBy')
    .lean();
  if (!event) throw ApiError.notFound('Event not found');
  return event;
}

async function findEventOr404(id: string) {
  const event = await Event.findById(id);
  if (!event) throw ApiError.notFound('Event not found');
  return event;
}

/**
 * Lead and co-leads must be people who can teach. Someone already on the event may stay even if since
 * deactivated, so editing an old event doesn't force rewriting who ran it.
 */
async function resolveLeaders(input: EventInput, alreadyOnEvent: string[] = []) {
  const coLeads = [...new Set(input.coLeads)].filter((id) => id !== input.leadBy);
  const ids = [input.leadBy, ...coLeads];
  const users = await User.find({ _id: { $in: ids } }).select('name role isActive').lean();
  if (users.length !== ids.length) throw ApiError.badRequest('One or more selected leads no longer exist');

  for (const user of users) {
    if (!TEACHING_ROLES.includes(user.role)) {
      throw ApiError.badRequest(`${user.name} is a ${user.role} and can't lead an event`);
    }
    if (!user.isActive && !alreadyOnEvent.includes(String(user._id))) {
      throw ApiError.badRequest(`${user.name} is deactivated and can't be newly assigned`);
    }
  }
  return coLeads;
}

async function assertBatchesExist(batchIds: string[]) {
  const unique = [...new Set(batchIds)];
  if (unique.length && (await Batch.countDocuments({ _id: { $in: unique } })) !== unique.length) {
    throw ApiError.badRequest('One or more linked batches no longer exist');
  }
  return unique;
}

export async function createEvent(actor: AuthUser, input: EventInput) {
  const coLeads = await resolveLeaders(input);
  const batches = await assertBatchesExist(input.batches);
  const event = await Event.create({ ...input, coLeads, batches, createdBy: actor.id });

  await logActivity({
    actor,
    action: 'created',
    entity: 'event',
    entityId: event._id,
    summary: `${actor.name} scheduled ${event.type.replace('-', ' ')} "${event.title}" for ${formatDayShort(event.day)}`,
  });
  return getEvent(actor, event.id);
}

export async function updateEvent(actor: AuthUser, id: string, input: EventInput) {
  const event = await findEventOr404(id);
  const coLeads = await resolveLeaders(input, [event.leadBy, ...event.coLeads].map(String));
  const batches = await assertBatchesExist(input.batches);

  event.set({ ...input, coLeads, batches });
  await event.save();

  await logActivity({
    actor,
    action: 'updated',
    entity: 'event',
    entityId: event._id,
    summary: `${actor.name} updated event "${event.title}"`,
  });
  return getEvent(actor, id);
}

export async function completeEvent(actor: AuthUser, id: string, input: CompleteEventInput) {
  const event = await findEventOr404(id);
  if (event.day > todayIST()) throw ApiError.badRequest("An event can't be completed before it happens");

  event.set({ ...input, status: 'completed' });
  await event.save();

  await logActivity({
    actor,
    action: 'completed',
    entity: 'event',
    entityId: event._id,
    summary: `${actor.name} marked "${event.title}" completed (${event.participantCount} participants)`,
  });
  return getEvent(actor, id);
}

export async function deleteEvent(actor: AuthUser, id: string) {
  const event = await findEventOr404(id);
  await event.deleteOne();

  await logActivity({
    actor,
    action: 'deleted',
    entity: 'event',
    entityId: event._id,
    summary: `${actor.name} deleted event "${event.title}"`,
  });
}
