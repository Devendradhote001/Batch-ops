import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import type { ApiSuccess, PublicUser } from '@batchops/shared';
import { api, unwrap } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import type { ChangePasswordValues, LoginValues } from './schemas';

/** Resolves to null (not an error) when nobody is signed in. */
async function fetchCurrentUser(): Promise<PublicUser | null> {
  try {
    return await unwrap<PublicUser>(api.get('/auth/me'));
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) return null;
    throw error;
  }
}

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60_000,
  });
}

/** The signed-in user, for components rendered behind RequireAuth. */
export function useAuthUser(): PublicUser {
  const { data } = useCurrentUser();
  if (!data) throw new Error('useAuthUser used outside an authenticated route');
  return data;
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: LoginValues) => unwrap<PublicUser>(api.post('/auth/login', values)),
    onSuccess: (user) => queryClient.setQueryData(queryKeys.me, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(queryKeys.me, null);
    },
  });
}

/**
 * "Forgot password". Always "succeeds" — the server doesn't reveal whether the email exists. Resolves to the
 * server's message, which says whether a link was emailed or the admin was asked.
 */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post<ApiSuccess<{ mode: 'email' | 'admin' }>>('/auth/forgot-password', { email });
      return { mode: data.data.mode, message: data.message ?? '' };
    },
  });
}

/** Sets a new password from the emailed link. */
export function useResetPasswordWithToken() {
  return useMutation({
    mutationFn: (values: { token: string; password: string }) => api.post('/auth/reset-password', values),
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: ChangePasswordValues) =>
      unwrap<PublicUser>(api.patch('/auth/me/password', { currentPassword, newPassword })),
    onSuccess: (user) => queryClient.setQueryData(queryKeys.me, user),
  });
}
