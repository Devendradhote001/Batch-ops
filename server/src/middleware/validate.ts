import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

interface RequestSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Parses body/query/params with Zod and replaces them with the parsed (coerced, stripped) values.
 * A ZodError is thrown on failure and rendered as 400 by the error handler.
 */
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    // Express 5 exposes req.query/req.params through getters, so redefine them.
    if (schemas.query) {
      Object.defineProperty(req, 'query', { value: schemas.query.parse(req.query), writable: true });
    }
    if (schemas.params) {
      Object.defineProperty(req, 'params', { value: schemas.params.parse(req.params), writable: true });
    }
    next();
  };
}
