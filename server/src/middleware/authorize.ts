import type { RequestHandler } from 'express';
import type { Role } from '@batchops/shared';
import { ApiError } from '../utils/ApiError';

/** Allows the request through only if the authenticated user has one of the given roles. */
export function authorize(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role)) throw ApiError.forbidden();
    next();
  };
}
