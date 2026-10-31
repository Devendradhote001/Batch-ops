import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Batch } from '@batchops/shared';
import { api, unwrap, unwrapPage } from '@/lib/api';
import { compactParams } from '@/lib/useUrlFilters';
import type { BatchFormValues } from './schemas';

export interface BatchListParams {
  q?: string;
  status?: string;
  instructor?: string;
  archived?: string;
  page?: number;
  limit?: number;
}

export const batchKeys = {
  all: ['batches'] as const,
  list: (params: BatchListParams) => ['batches', 'list', params] as const,
  detail: (id: string) => ['batches', 'detail', id] as const,
};

export function useBatches(params: BatchListParams) {
  return useQuery({
    queryKey: batchKeys.list(params),
    queryFn: () => unwrapPage<Batch>(api.get('/batches', { params: compactParams({ limit: 12, ...params }) })),
    placeholderData: keepPreviousData,
  });
}

export function useBatch(id: string) {
  return useQuery({
    queryKey: batchKeys.detail(id),
    queryFn: () => unwrap<Batch>(api.get(`/batches/${id}`)),
  });
}

/** Every batch mutation returns the fresh batch: seed its detail cache and refresh the lists. */
function useBatchMutation<V>(mutationFn: (values: V) => Promise<Batch>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (batch) => {
      queryClient.setQueryData(batchKeys.detail(batch._id), batch);
      queryClient.invalidateQueries({ queryKey: ['batches', 'list'] });
    },
  });
}

export function useSaveBatch(id?: string) {
  return useBatchMutation((values: BatchFormValues) =>
    unwrap<Batch>(id ? api.put(`/admin/batches/${id}`, values) : api.post('/admin/batches', values)),
  );
}

export function useArchiveBatch() {
  return useBatchMutation(({ id, isArchived }: { id: string; isArchived: boolean }) =>
    unwrap<Batch>(api.patch(`/admin/batches/${id}/archive`, { isArchived })),
  );
}

export function useToggleModule(batchId: string) {
  return useBatchMutation(({ moduleId, isCompleted }: { moduleId: string; isCompleted: boolean }) =>
    unwrap<Batch>(api.patch(`/admin/batches/${batchId}/modules/${moduleId}`, { isCompleted })),
  );
}
