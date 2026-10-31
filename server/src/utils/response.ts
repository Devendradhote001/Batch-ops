import type { Response } from 'express';
import type { ApiSuccess, PaginationMeta } from '@batchops/shared';

interface SendOptions {
  status?: number;
  message?: string;
  meta?: PaginationMeta;
}

export function sendSuccess<T>(res: Response, data: T, { status = 200, message, meta }: SendOptions = {}) {
  const body: ApiSuccess<T> = { success: true, data };
  if (message) body.message = message;
  if (meta) body.meta = meta;
  res.status(status).json(body);
}
