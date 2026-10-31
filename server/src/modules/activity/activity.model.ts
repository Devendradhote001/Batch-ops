import { Schema, model, type InferSchemaType } from 'mongoose';

export const ACTIVITY_ENTITIES = ['user', 'batch', 'session', 'update', 'event'] as const;

const activitySchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    entity: { type: String, enum: ACTIVITY_ENTITIES, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    /** Rendered when logged ("Asha created batch MERN-OCT-26"), so the feed needs no joins. */
    summary: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activitySchema.index({ createdAt: -1 });
activitySchema.index({ entity: 1, entityId: 1 });

export type ActivityAttrs = InferSchemaType<typeof activitySchema>;

export const Activity = model('Activity', activitySchema);
