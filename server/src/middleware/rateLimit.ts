import rateLimit from 'express-rate-limit';
import type { ApiFailure } from '@batchops/shared';

function limiter(windowMinutes: number, limit: number, message: string, skipSuccessfulRequests = false) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    skipSuccessfulRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      const body: ApiFailure = { success: false, error: { code: 'RATE_LIMITED', message } };
      res.status(429).json(body);
    },
  });
}

/** Failed logins only count against the limit, so a user who signs in fine is never throttled. */
export const loginLimiter = limiter(15, 10, 'Too many sign-in attempts. Try again in 15 minutes.', true);

/** Reset requests notify the admin, so keep them from being used to spam the feed. */
export const forgotPasswordLimiter = limiter(15, 5, 'Too many reset requests. Try again in 15 minutes.');

export const refreshLimiter = limiter(15, 100, 'Too many requests. Try again shortly.');
