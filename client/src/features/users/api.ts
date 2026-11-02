import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PublicUser, Role, UserSummary } from '@batchops/shared';
import { api, unwrap, unwrapPage } from '@/lib/api';
import { compactParams } from '@/lib/useUrlFilters';
import type { UserFormValues } from './schemas';

export interface UserListParams {
  q?: string;
  role?: string;
  status?: string;
  resetRequested?: 'true';
  page?: number;
}

export const userKeys = {
  all: ['users'] as const,
  list: (params: UserListParams) => ['users', 'list', params] as const,
  options: (roles: string) => ['users', 'options', roles] as const,
};

export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => unwrapPage<PublicUser>(api.get('/admin/users', { params: compactParams({ ...params, limit: 20 }) })),
    placeholderData: keepPreviousData,
  });
}

/** Active users for pickers and filters. Defaults to everyone who can teach. */
export function useUserOptions(roles: Role[] = ['instructor', 'admin']) {
  const rolesParam = roles.join(',');
  return useQuery({
    queryKey: userKeys.options(rolesParam),
    queryFn: () => unwrap<UserSummary[]>(api.get('/users/options', { params: { roles: rolesParam } })),
    staleTime: 5 * 60_000,
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: userKeys.all });
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (values: UserFormValues & { password: string }) => unwrap<PublicUser>(api.post('/admin/users', values)),
    onSuccess: invalidate,
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, ...values }: Partial<UserFormValues> & { id: string }) =>
      unwrap<PublicUser>(api.patch(`/admin/users/${id}`, values)),
    onSuccess: invalidate,
  });
}

export function useSetUserStatus() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      unwrap<PublicUser>(api.patch(`/admin/users/${id}/status`, { isActive })),
    onSuccess: invalidate,
  });
}

export function useResetPassword() {
  const invalidate = useInvalidateUsers();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      unwrap<PublicUser>(api.post(`/admin/users/${id}/reset-password`, { password })),
    // Clears the user's pending reset request, so refresh the lists and the dashboard alert.
    onSuccess: () => Promise.all([invalidate(), queryClient.invalidateQueries({ queryKey: ['dashboard'] })]),
  });
}
