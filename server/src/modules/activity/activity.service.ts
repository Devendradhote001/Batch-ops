import type { Types } from 'mongoose';
import type { AuthUser } from '../../types/express';
import { Activity, type ACTIVITY_ENTITIES } from './activity.model';

interface ActivityInput {
  actor: AuthUser;
  action: string;
  entity: (typeof ACTIVITY_ENTITIES)[number];
  entityId: Types.ObjectId | string;
  summary: string;
}

/** Records an activity entry. Never fails the request that triggered it. */
export async function logActivity({ actor, action, entity, entityId, summary }: ActivityInput) {
  try {
    await Activity.create({ actor: actor.id, action, entity, entityId, summary });
  } catch (err) {
    console.error('Failed to log activity', err);
  }
}
