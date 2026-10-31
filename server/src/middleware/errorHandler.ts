import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import type { ApiFailure } from '@batchops/shared';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

export const notFound: RequestHandler = (req) => {
  throw ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`);
};

function isDuplicateKeyError(err: unknown): err is { code: 11000; keyValue?: Record<string, unknown> } {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
    const first = details[0];
    const message = first ? (first.path ? `${first.path}: ${first.message}` : first.message) : 'Invalid request';
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }

  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for ${err.path}`);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return new ApiError(400, 'VALIDATION_ERROR', details[0]?.message ?? 'Invalid data', details);
  }

  if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'value';
    return ApiError.conflict(`A record with this ${field} already exists`);
  }

  // Malformed JSON body from express.json()
  if (err instanceof SyntaxError && 'body' in err) {
    return ApiError.badRequest('Malformed JSON body');
  }

  return new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const apiError = toApiError(err);

  if (apiError.status >= 500) {
    console.error(err);
  }

  const body: ApiFailure = {
    success: false,
    error: { code: apiError.code, message: apiError.message },
  };
  if (apiError.details !== undefined) body.error.details = apiError.details;
  if (apiError.status >= 500 && !env.isProduction && err instanceof Error) {
    body.error.details = { stack: err.stack };
  }

  res.status(apiError.status).json(body);
};
