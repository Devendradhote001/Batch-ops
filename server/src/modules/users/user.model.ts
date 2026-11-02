import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { AVATAR_COLORS, ROLES } from '@batchops/shared';

function randomAvatarColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, default: 'instructor' },
    avatarColor: { type: String, default: randomAvatarColor },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
    /** Set when the user asks for a reset from the login page; cleared once the password changes or they sign in. */
    passwordResetRequestedAt: { type: Date, default: null },
    /** SHA-256 of the emailed reset token (the token itself is never stored) and when it stops working. */
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
    /** Bumped on password change/reset or deactivation to invalidate every issued token. */
    tokenVersion: { type: Number, default: 0, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        delete ret.tokenVersion;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpiresAt;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ passwordResetRequestedAt: 1 }, { sparse: true });
userSchema.index({ passwordResetTokenHash: 1 }, { sparse: true });

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserAttrs>;

export const User = model('User', userSchema);
