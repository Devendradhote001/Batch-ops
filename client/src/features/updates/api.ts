import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import type { DailyUpdate } from '@batchops/shared';
import { api, unwrap, unwrapPage } from '@/lib/api';
import { compactParams } from '@/lib/useUrlFilters';
import { toUpdatePayload, type UpdateFormValues } from './schemas';

export interface UpdateListParams {
  from?: string;
  to?: string;
  status?: string;
}

export const updateKeys = {
  all: ['updates'] as const,
  list: (params: UpdateListParams) => ['updates', 'list', params] as const,
  day: (day: string) => ['updates', 'day', day] as const,
};

/** Newest first, ten at a time. */
export function useUpdatesFeed(params: UpdateListParams) {
  return useInfiniteQuery({
    queryKey: updateKeys.list(params),
    queryFn: ({ pageParam }) =>
      unwrapPage<DailyUpdate>(api.get('/updates', { params: compactParams({ ...params, page: pageParam, limit: 10 }) })),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });
}

/** The update filed for a day, or null if none has been filed yet. */
export function useUpdate(day: string, enabled = true) {
  return useQuery({
    queryKey: updateKeys.day(day),
    enabled,
    queryFn: async () => {
      try {
        return await unwrap<DailyUpdate>(api.get(`/updates/${day}`));
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
      }
    },
  });
}

export function useSaveUpdate(day: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: UpdateFormValues) => unwrap<DailyUpdate>(api.put(`/updates/${day}`, toUpdatePayload(values))),
    onSuccess: (update) => {
      queryClient.setQueryData(updateKeys.day(day), update);
      queryClient.invalidateQueries({ queryKey: ['updates', 'list'] });
    },
  });
}
