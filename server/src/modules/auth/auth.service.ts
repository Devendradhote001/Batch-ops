import { createHash, randomBytes } from 'node:crypto';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { emailEnabled, passwordResetEmail, sendEmail } from '../../utils/mailer';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../../utils/password';
import { logActivity } from '../activity/activity.service';
import { User, type UserDocument } from '../users/user.model';
import { verifyRefreshToken } from './auth.tokens';
import type { ChangePasswordInput, LoginInput, ResetPasswordWithTokenInput } from './auth.schema';

const RESET_LINK_TTL_MINUTES = 30;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

const INVALID_CREDENTIALS = () => ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

export async function login({ email, password }: LoginInput): Promise<UserDocument> {
  const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');

  if (!user) {
    await burnPasswordCheck(password);
    throw INVALID_CREDENTIALS();
  }
  if (!(await verifyPassword(password, user.passwordHash))) throw INVALID_CREDENTIALS();
  if (!user.isActive) {
    throw new ApiError(403, 'ACCOUNT_DISABLED', 'Your account has been deactivated. Contact your admin.');
  }

  user.lastLoginAt = new Date();
  // They got in, so any pending reset request is moot.
  user.passwordResetRequestedAt = null;
  await user.save();
  return user;
}

/**
 * "Forgot password". With email configured, sends a single-use link that expires in 30 minutes. Without it,
 * records the request so an admin can set a temporary password from Admin → Users.
 * It never changes a password itself (anyone can call this), and the caller gets the same answer whether or not
 * the email has an account, so it can't be used to discover who's registered.
 * Returns how the request is handled, for the response message.
 */
export async function requestPasswordReset(email: string): Promise<'email' | 'admin'> {
  const mode = emailEnabled ? 'email' : 'admin';
  const user = await User.findOne({ email, isActive: true });
  if (!user) return mode;

  if (mode === 'email') {
    // URL-safe, 256 bits. Only its hash is stored; a new request replaces any earlier link.
    const token = randomBytes(32).toString('base64url');
    user.set({
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiresAt: new Date(Date.now() + RESET_LINK_TTL_MINUTES * 60_000),
    });
    await user.save();

    const link = `${env.appUrl}/reset-password?token=${token}`;
    try {
      await sendEmail(passwordResetEmail({ name: user.name, email: user.email, link, minutes: RESET_LINK_TTL_MINUTES }));
    } catch (err) {
      // Don't tell the caller (it would reveal the account exists); make it visible to whoever runs the server.
      console.error(`Password reset email to ${user.email} failed:`, err instanceof Error ? err.message : err);
    }
    return mode;
  }

  const alreadyPending = !!user.passwordResetRequestedAt;
  user.passwordResetRequestedAt = new Date();
  await user.save();

  if (!alreadyPending) {
    await logActivity({
      actor: { id: user.id, role: user.role, name: user.name, email: user.email },
      action: 'password-reset-requested',
      entity: 'user',
      entityId: user._id,
      summary: `${user.name} asked for a password reset`,
    });
  }
  return mode;
}

/** Sets a new password from an emailed link. The link is single-use and signs the account out everywhere. */
export async function resetPasswordWithToken({ token, password }: ResetPasswordWithTokenInput): Promise<void> {
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(token),
    passwordResetExpiresAt: { $gt: new Date() },
    isActive: true,
  }).select('+tokenVersion');
  if (!user) {
    throw new ApiError(400, 'INVALID_RESET_LINK', 'This reset link is invalid or has expired. Request a new one.');
  }

  user.set({
    passwordHash: await hashPassword(password),
    tokenVersion: user.tokenVersion + 1,
    passwordResetTokenHash: null,
    passwordResetExpiresAt: null,
    passwordResetRequestedAt: null,
  });
  await user.save();

  await logActivity({
    actor: { id: user.id, role: user.role, name: user.name, email: user.email },
    action: 'password-reset',
    entity: 'user',
    entityId: user._id,
    summary: `${user.name} reset their password from an email link`,
  });
}

/** Validates a refresh token against the user's current state and returns the user to re-issue tokens for. */
export async function refresh(refreshToken: string): Promise<UserDocument> {
  const payload = verifyRefreshToken(refreshToken);
  const user = await User.findById(payload.sub).select('+tokenVersion');

  if (!user || !user.isActive || user.tokenVersion !== payload.tv) {
    throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.', 'SESSION_REVOKED');
  }
  return user;
}

export async function getCurrentUser(userId: string): Promise<UserDocument> {
  const user = await User.findById(userId);
  if (!user) throw ApiError.unauthorized();
  return user;
}

/** Changes the password and bumps tokenVersion, which signs the user out on every other device. */
export async function changePassword(
  userId: string,
  { currentPassword, newPassword }: ChangePasswordInput,
): Promise<UserDocument> {
  const user = await User.findById(userId).select('+passwordHash +tokenVersion');
  if (!user) throw ApiError.unauthorized();

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new ApiError(400, 'INVALID_PASSWORD', 'Current password is incorrect');
  }

  user.passwordHash = await hashPassword(newPassword);
  user.tokenVersion += 1;
  user.set({ passwordResetRequestedAt: null, passwordResetTokenHash: null, passwordResetExpiresAt: null });
  await user.save();
  return user;
}
