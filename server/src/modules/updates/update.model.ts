import { Schema, model, type InferSchemaType } from 'mongoose';
import { UPDATE_STATUSES } from '@batchops/shared';

const dailyUpdateSchema = new Schema(
  {
    /** IST calendar day, YYYY-MM-DD. One update per day, written with an upsert. */
    day: { type: String, required: true, unique: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    summary: { type: String, required: true, trim: true, maxlength: 4000 },
    highlights: [{ type: String, trim: true, maxlength: 300 }],
    blockers: [{ type: String, trim: true, maxlength: 300 }],
    nextDayPlan: [{ type: String, trim: true, maxlength: 300 }],
    batchNotes: [
      {
        _id: false,
        batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
        note: { type: String, required: true, trim: true, maxlength: 1000 },
      },
    ],
    status: { type: String, enum: UPDATE_STATUSES, required: true, default: 'on-track' },
  },
  { timestamps: true },
);

export type DailyUpdateAttrs = InferSchemaType<typeof dailyUpdateSchema>;

export const DailyUpdate = model('DailyUpdate', dailyUpdateSchema);
