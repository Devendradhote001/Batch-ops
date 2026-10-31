import type { AuthUser } from '../../types/express';
import { ApiError } from '../../utils/ApiError';
import { formatDayShort } from '../../utils/day';
import { buildMeta, toSkip } from '../../utils/pagination';
import { logActivity } from '../activity/activity.service';
import { Batch } from '../batches/batch.model';
import { DailyUpdate } from './update.model';
import type { ListUpdatesQuery, UpdateInput } from './update.schema';

function populateUpdate<Q extends { populate: (path: string, select: string) => Q }>(query: Q) {
  return query.populate('author', 'name avatarColor role').populate('batchNotes.batch', 'name code');
}

export async function listUpdates(query: ListUpdatesQuery) {
  const conditions: Record<string, unknown>[] = [];
  if (query.from) conditions.push({ day: { $gte: query.from } });
  if (query.to) conditions.push({ day: { $lte: query.to } });
  if (query.status) conditions.push({ status: query.status });
  const filter = conditions.length ? { $and: conditions } : {};

  const [items, total] = await Promise.all([
    populateUpdate(DailyUpdate.find(filter)).sort({ day: -1 }).skip(toSkip(query)).limit(query.limit).select('-__v').lean(),
    DailyUpdate.countDocuments(filter),
  ]);
  return { items, meta: buildMeta(query, total) };
}

export async function getUpdate(day: string) {
  const update = await populateUpdate(DailyUpdate.findOne({ day })).select('-__v').lean();
  if (!update) throw ApiError.notFound('No update has been filed for this day');
  return update;
}

/** Creates or replaces the update for a day — there is exactly one per day. */
export async function saveUpdate(user: AuthUser, day: string, input: UpdateInput) {
  const batchIds = [...new Set(input.batchNotes.map((n) => n.batch))];
  if (batchIds.length && (await Batch.countDocuments({ _id: { $in: batchIds } })) !== batchIds.length) {
    throw ApiError.badRequest('A batch note refers to a batch that no longer exists');
  }

  const existed = await DailyUpdate.exists({ day });
  await DailyUpdate.findOneAndUpdate(
    { day },
    { $set: { ...input, author: user.id } },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  const update = await getUpdate(day);
  await logActivity({
    actor: user,
    action: existed ? 'updated' : 'created',
    entity: 'update',
    entityId: update._id,
    summary: `${user.name} ${existed ? 'edited' : 'filed'} the daily update for ${formatDayShort(day)} (${input.status})`,
  });
  return { update, created: !existed };
}
