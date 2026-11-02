import { logActivity } from '../activity/activity.service';
import { User, type UserDocument } from '../users/user.model';
import { ApiError } from '../../utils/ApiError';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../../utils/password';
import { verifyRefreshToken } from './auth.tokens';
import type { ChangePasswordInput, LoginInput } from './auth.schema';

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
 * "Forgot password": records the request so an admin can set a temporary password from Admin → Users.
 * It never changes the password itself (anyone can call this), and the response is the same whether or not
 * the email has an account, so it can't be used to discover who's registered.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email, isActive: true });
  if (!user) return;

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
  user.passwordResetRequestedAt = null;
  await user.save();
  return user;
}
