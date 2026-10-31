import { Types } from 'mongoose';
import type { AuthUser } from '../../types/express';
import { ApiError } from '../../utils/ApiError';
import { buildMeta, toSkip } from '../../utils/pagination';
import { escapeRegex } from '../../utils/validators';
import { logActivity } from '../activity/activity.service';
import { Session } from '../sessions/session.model';
import { User } from '../users/user.model';
import { TEACHING_ROLES } from '../users/user.service';
import { Batch, type BatchAttrs, type BatchDocument } from './batch.model';
import type { BatchInput, ListBatchesQuery } from './batch.schema';

const USER_SUMMARY_FIELDS = 'name avatarColor role isActive email';

/** Instructors only see batches they teach; admins and viewers see all. */
function visibilityFilter(user: AuthUser): Record<string, unknown> {
  return user.role === 'instructor' ? { instructors: new Types.ObjectId(user.id) } : {};
}

type BatchLean = Pick<BatchAttrs, 'modules' | 'totalPlannedSessions'> & { _id: Types.ObjectId };

/** Adds session progress and module completion counts to each batch. */
async function withStats<T extends BatchLean>(batches: T[]) {
  const counts = await Session.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { batch: { $in: batches.map((b) => b._id) }, status: 'completed' } },
    { $group: { _id: '$batch', count: { $sum: 1 } } },
  ]);
  const completedByBatch = new Map(counts.map((c) => [String(c._id), c.count]));

  return batches.map((batch) => {
    const sessionsCompleted = completedByBatch.get(String(batch._id)) ?? 0;
    const planned = batch.totalPlannedSessions;
    return {
      ...batch,
      stats: {
        sessionsCompleted,
        progress: planned > 0 ? Math.min(100, Math.round((sessionsCompleted / planned) * 100)) : 0,
        modulesCompleted: batch.modules.filter((m) => m.isCompleted).length,
        modulesTotal: batch.modules.length,
      },
    };
  });
}

function populateBatch<Q extends { populate: (path: string, select: string) => Q }>(query: Q) {
  return query.populate('leadInstructor', USER_SUMMARY_FIELDS).populate('instructors', USER_SUMMARY_FIELDS);
}

export async function listBatches(user: AuthUser, query: ListBatchesQuery) {
  const conditions: Record<string, unknown>[] = [visibilityFilter(user)];
  if (query.archived !== 'all') conditions.push({ isArchived: query.archived === 'true' });
  if (query.status) conditions.push({ status: query.status });
  if (query.instructor) conditions.push({ instructors: new Types.ObjectId(query.instructor) });
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    conditions.push({ $or: [{ name: rx }, { code: rx }] });
  }
  const filter = { $and: conditions };

  const [items, total] = await Promise.all([
    populateBatch(Batch.find(filter))
      .sort({ startDate: -1, name: 1 })
      .skip(toSkip(query))
      .limit(query.limit)
      .select('-__v')
      .lean(),
    Batch.countDocuments(filter),
  ]);
  return { items: await withStats(items), meta: buildMeta(query, total) };
}

/** Non-archived batches the user can see, with only what pickers need. */
export function listBatchOptions(user: AuthUser) {
  return Batch.find({ isArchived: false, ...visibilityFilter(user) })
    .select('name code status studentCount instructors modules._id modules.title')
    .populate('instructors', 'name avatarColor role isActive')
    .sort({ name: 1 })
    .lean();
}

export async function getBatch(user: AuthUser, id: string) {
  const batch = await populateBatch(Batch.findOne({ _id: id, ...visibilityFilter(user) }))
    .select('-__v')
    .lean();
  if (!batch) throw ApiError.notFound('Batch not found');
  const [withStatsBatch] = await withStats([batch]);
  return withStatsBatch;
}

async function findBatchOr404(id: string) {
  const batch = await Batch.findById(id);
  if (!batch) throw ApiError.notFound('Batch not found');
  return batch;
}

async function assertCodeAvailable(code: string, exceptId?: string) {
  const existing = await Batch.exists({ code, ...(exceptId && { _id: { $ne: exceptId } }) });
  if (existing) throw ApiError.conflict(`A batch with code ${code} already exists`);
}

/**
 * Ensures every assigned user exists and can teach. Users already on the batch may stay even if they
 * have since been deactivated, so editing an old batch doesn't force rewriting its history.
 */
async function resolveInstructors(input: BatchInput, alreadyAssigned: string[] = []) {
  const ids = [...new Set([input.leadInstructor, ...input.instructors])];
  const users = await User.find({ _id: { $in: ids } }).select('name role isActive').lean();
  if (users.length !== ids.length) throw ApiError.badRequest('One or more selected instructors no longer exist');

  for (const user of users) {
    if (!TEACHING_ROLES.includes(user.role)) {
      throw ApiError.badRequest(`${user.name} is a ${user.role} and can't be assigned to a batch`);
    }
    if (!user.isActive && !alreadyAssigned.includes(String(user._id))) {
      throw ApiError.badRequest(`${user.name} is deactivated and can't be newly assigned`);
    }
  }
  return ids.map((id) => new Types.ObjectId(id));
}

/** Keeps completedAt for modules whose completion didn't change; stamps newly completed ones. */
function mergeModules(existing: BatchDocument['modules'] | undefined, incoming: BatchInput['modules']) {
  const previous = new Map((existing ?? []).map((m) => [String(m._id), m]));
  return incoming.map(({ _id, title, isCompleted }) => {
    const old = _id ? previous.get(_id) : undefined;
    return {
      ...(old && { _id: old._id }),
      title,
      isCompleted,
      completedAt: isCompleted ? (old?.isCompleted ? old.completedAt : new Date()) : null,
    };
  });
}

export async function createBatch(actor: AuthUser, input: BatchInput) {
  await assertCodeAvailable(input.code);
  const instructors = await resolveInstructors(input);

  const batch = await Batch.create({
    ...input,
    instructors,
    modules: mergeModules(undefined, input.modules),
    createdBy: actor.id,
  });

  await logActivity({
    actor,
    action: 'created',
    entity: 'batch',
    entityId: batch._id,
    summary: `${actor.name} created batch ${batch.code}`,
  });
  return getBatch(actor, batch.id);
}

export async function updateBatch(actor: AuthUser, id: string, input: BatchInput) {
  const batch = await findBatchOr404(id);
  if (input.code !== batch.code) await assertCodeAvailable(input.code, id);
  const instructors = await resolveInstructors(input, batch.instructors.map(String));

  batch.set({ ...input, instructors, modules: mergeModules(batch.modules, input.modules) });
  await batch.save();

  await logActivity({
    actor,
    action: 'updated',
    entity: 'batch',
    entityId: batch._id,
    summary: `${actor.name} updated batch ${batch.code}`,
  });
  return getBatch(actor, id);
}

export async function setBatchArchived(actor: AuthUser, id: string, isArchived: boolean) {
  const batch = await findBatchOr404(id);
  if (batch.isArchived !== isArchived) {
    batch.isArchived = isArchived;
    await batch.save();
    await logActivity({
      actor,
      action: isArchived ? 'archived' : 'restored',
      entity: 'batch',
      entityId: batch._id,
      summary: `${actor.name} ${isArchived ? 'archived' : 'restored'} batch ${batch.code}`,
    });
  }
  return getBatch(actor, id);
}

export async function setModuleCompleted(actor: AuthUser, id: string, moduleId: string, isCompleted: boolean) {
  const batch = await findBatchOr404(id);
  const module = batch.modules.id(moduleId);
  if (!module) throw ApiError.notFound('Module not found');

  if (module.isCompleted !== isCompleted) {
    module.isCompleted = isCompleted;
    module.completedAt = isCompleted ? new Date() : null;
    await batch.save();
    if (isCompleted) {
      await logActivity({
        actor,
        action: 'module-completed',
        entity: 'batch',
        entityId: batch._id,
        summary: `${actor.name} marked "${module.title}" complete in ${batch.code}`,
      });
    }
  }
  return getBatch(actor, id);
}
