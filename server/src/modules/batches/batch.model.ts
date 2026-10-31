import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { BATCH_STATUSES } from '@batchops/shared';

const moduleSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
});

const batchSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    /** IST calendar days, YYYY-MM-DD — a batch's dates have no time-of-day. */
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    status: { type: String, enum: BATCH_STATUSES, required: true, default: 'upcoming' },
    leadInstructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Everyone who teaches this batch. Always includes the lead, so visibility checks need one field. */
    instructors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    studentCount: { type: Number, min: 0, default: 0 },
    schedule: {
      days: [{ type: Number, min: 0, max: 6 }],
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
    },
    totalPlannedSessions: { type: Number, required: true, min: 1 },
    modules: [moduleSchema],
    isArchived: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

batchSchema.index({ isArchived: 1, status: 1, startDate: -1 });
batchSchema.index({ instructors: 1 });

export type BatchAttrs = InferSchemaType<typeof batchSchema>;
export type BatchDocument = HydratedDocument<BatchAttrs>;

export const Batch = model('Batch', batchSchema);
