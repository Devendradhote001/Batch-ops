import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { VerticalEvent } from '@batchops/shared';
import { api, unwrap, unwrapPage } from '@/lib/api';
import { compactParams } from '@/lib/useUrlFilters';
import { toEventFormValues, type CompleteEventFormValues, type EventFormValues } from './schemas';

export interface EventListParams {
  from?: string;
  to?: string;
  type?: string;
  status?: string;
  batch?: string;
  leader?: string;
  sort?: 'asc' | 'desc';
  limit?: number;
}

export const eventKeys = {
  all: ['events'] as const,
  list: (params: EventListParams) => ['events', 'list', params] as const,
  infinite: (params: EventListParams) => ['events', 'infinite', params] as const,
};

export function useEvents(params: EventListParams) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: () => unwrapPage<VerticalEvent>(api.get('/events', { params: compactParams({ limit: 200, ...params }) })),
    placeholderData: keepPreviousData,
  });
}

export function useInfiniteEvents(params: EventListParams) {
  return useInfiniteQuery({
    queryKey: eventKeys.infinite(params),
    queryFn: ({ pageParam }) =>
      unwrapPage<VerticalEvent>(api.get('/events', { params: compactParams({ limit: 20, ...params, page: pageParam }) })),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });
}

function useEventMutation<V>(mutationFn: (values: V) => Promise<VerticalEvent | null>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.all }) });
}

function toPayload(values: EventFormValues) {
  return { ...values, coLeads: values.coLeads.filter((id) => id !== values.leadBy) };
}

export function useSaveEvent(id?: string) {
  return useEventMutation((values: EventFormValues) =>
    unwrap<VerticalEvent>(id ? api.put(`/admin/events/${id}`, toPayload(values)) : api.post('/admin/events', toPayload(values))),
  );
}

export function useCompleteEvent() {
  return useEventMutation(({ id, ...values }: CompleteEventFormValues & { id: string }) =>
    unwrap<VerticalEvent>(api.patch(`/admin/events/${id}/complete`, values)),
  );
}

export function useCancelEvent() {
  return useEventMutation((event: VerticalEvent) =>
    unwrap<VerticalEvent>(api.put(`/admin/events/${event._id}`, toPayload({ ...toEventFormValues(event), status: 'cancelled' }))),
  );
}

export function useDeleteEvent() {
  return useEventMutation(async (id: string) => {
    await api.delete(`/admin/events/${id}`);
    return null;
  });
}
