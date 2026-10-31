import { Schema, model, type InferSchemaType } from 'mongoose';
import { SESSION_STATUSES, SESSION_TYPES } from '@batchops/shared';

const sessionSchema = new Schema(
  {
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    /** IST calendar day, YYYY-MM-DD */
    day: { type: String, required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    topic: { type: String, trim: true, maxlength: 160, default: '' },
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: SESSION_TYPES, required: true, default: 'lecture' },
    durationMinutes: { type: Number, required: true, min: 0, max: 24 * 60 },
    attendanceCount: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: SESSION_STATUSES, required: true, default: 'completed' },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    recordingLink: { type: String, trim: true, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

sessionSchema.index({ batch: 1, day: 1 });
sessionSchema.index({ instructor: 1, day: 1 });
sessionSchema.index({ day: 1 });

export type SessionAttrs = InferSchemaType<typeof sessionSchema>;

export const Session = model('Session', sessionSchema);
