import type { Request, RequestHandler } from 'express';
import { ACCESS_COOKIE, verifyAccessToken } from '../modules/auth/auth.tokens';
import { User } from '../modules/users/user.model';
import { ApiError } from '../utils/ApiError';
import type { AuthUser } from '../types/express';

/**
 * Verifies the access token and re-loads the user, so a deactivation, role change or
 * password reset takes effect on the very next request instead of when the token expires.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const token: string | undefined = req.cookies?.[ACCESS_COOKIE];
  if (!token) throw ApiError.unauthorized();

  const payload = verifyAccessToken(token);
  const user = await User.findById(payload.sub).select('name email role isActive +tokenVersion').lean();

  if (!user || !user.isActive || user.tokenVersion !== payload.tv) {
    throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.', 'SESSION_REVOKED');
  }

  req.user = { id: String(user._id), role: user.role, name: user.name, email: user.email };
  next();
};

/** The authenticated user for handlers mounted behind `authenticate`. */
export function getAuthUser(req: Request): AuthUser {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}
