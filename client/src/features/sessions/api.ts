import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BatchOption, Session, SessionCalendarDay } from '@batchops/shared';
import { batchKeys } from '@/features/batches/api';
import { api, unwrap, unwrapPage } from '@/lib/api';
import { compactParams } from '@/lib/useUrlFilters';
import type { SessionFormValues } from './schemas';

export interface SessionListParams {
  day?: string;
  from?: string;
  to?: string;
  batch?: string;
  instructor?: string;
  status?: string;
  type?: string;
}

export const sessionKeys = {
  all: ['sessions'] as const,
  list: (params: SessionListParams) => ['sessions', 'list', params] as const,
  infinite: (params: SessionListParams) => ['sessions', 'infinite', params] as const,
  calendar: (month: string, params: SessionListParams) => ['sessions', 'calendar', month, params] as const,
};

/** Every session on one day (or matching filters), up to 100. */
export function useSessions(params: SessionListParams) {
  return useQuery({
    queryKey: sessionKeys.list(params),
    queryFn: () => unwrapPage<Session>(api.get('/sessions', { params: compactParams({ ...params, limit: 100 }) })),
    placeholderData: keepPreviousData,
  });
}

/** Paged sessions, newest first — for timelines with "Load more". */
export function useInfiniteSessions(params: SessionListParams) {
  return useInfiniteQuery({
    queryKey: sessionKeys.infinite(params),
    queryFn: ({ pageParam }) =>
      unwrapPage<Session>(api.get('/sessions', { params: compactParams({ ...params, page: pageParam, limit: 20 }) })),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });
}

export function useSessionCalendar(month: string, params: Pick<SessionListParams, 'batch' | 'instructor'>) {
  return useQuery({
    queryKey: sessionKeys.calendar(month, params),
    queryFn: () => unwrap<SessionCalendarDay[]>(api.get('/sessions/calendar', { params: compactParams({ month, ...params }) })),
    placeholderData: keepPreviousData,
  });
}

export function useBatchOptions() {
  return useQuery({
    queryKey: [...batchKeys.all, 'options'],
    queryFn: () => unwrap<BatchOption[]>(api.get('/batches/options')),
    staleTime: 60_000,
  });
}

/** Sessions change batch progress too, so refresh both. */
function useInvalidateAfterSessionChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
      queryClient.invalidateQueries({ queryKey: batchKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
}

function toPayload({ instructor, ...values }: SessionFormValues) {
  return { ...values, ...(instructor && { instructor }) };
}

export function useSaveSession(id?: string) {
  const invalidate = useInvalidateAfterSessionChange();
  return useMutation({
    mutationFn: (values: SessionFormValues) =>
      unwrap<Session>(id ? api.put(`/sessions/${id}`, toPayload(values)) : api.post('/sessions', toPayload(values))),
    onSuccess: invalidate,
  });
}

export function useDeleteSession() {
  const invalidate = useInvalidateAfterSessionChange();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/sessions/${id}`),
    onSuccess: invalidate,
  });
}
