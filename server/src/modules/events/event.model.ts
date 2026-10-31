import { Schema, model, type InferSchemaType } from 'mongoose';
import { EVENT_STATUSES, EVENT_TYPES } from '@batchops/shared';

const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    /** IST calendar day, YYYY-MM-DD */
    day: { type: String, required: true },
    /** HH:mm (IST), or '' when not set */
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
    type: { type: String, enum: EVENT_TYPES, required: true },
    /** Empty means the event is vertical-wide. */
    batches: [{ type: Schema.Types.ObjectId, ref: 'Batch' }],
    leadBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coLeads: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    description: { type: String, trim: true, maxlength: 4000, default: '' },
    location: { type: String, trim: true, maxlength: 300, default: '' },
    status: { type: String, enum: EVENT_STATUSES, required: true, default: 'planned' },
    outcomeNotes: { type: String, trim: true, maxlength: 4000, default: '' },
    participantCount: { type: Number, min: 0, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

eventSchema.index({ day: 1 });
eventSchema.index({ leadBy: 1, day: 1 });
eventSchema.index({ coLeads: 1 });
eventSchema.index({ batches: 1 });

export type EventAttrs = InferSchemaType<typeof eventSchema>;

export const Event = model('Event', eventSchema);
