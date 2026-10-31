import { z } from 'zod';
import type { PaginationMeta } from '@batchops/shared';

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuery>;

export function toSkip({ page, limit }: PaginationQuery) {
  return (page - 1) * limit;
}

export function buildMeta({ page, limit }: PaginationQuery, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
