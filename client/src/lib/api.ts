import axios, { isAxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type { ApiFailure, ApiSuccess, PaginationMeta } from '@batchops/shared';
import { queryClient, queryKeys } from './queryClient';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
});

/** Auth endpoints whose 401s mean "bad credentials / no session", not "access token expired". */
const SKIP_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout'];

let refreshInFlight: Promise<unknown> | null = null;



api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const shouldRefresh =
      isAxiosError(error) &&
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !SKIP_REFRESH.some((path) => original.url?.startsWith(path));

    if (!shouldRefresh) return Promise.reject(error);

    original._retried = true;
    try {
      // Concurrent 401s share one refresh call.
      refreshInFlight ??= api.post('/auth/refresh').finally(() => {
        refreshInFlight = null;
      });
      await refreshInFlight;
      return api(original);
    } catch {
      // Refresh failed: the session is over. Route guards react to the null user.
      queryClient.setQueryData(queryKeys.me, null);
      return Promise.reject(error);
    }
  },
);

/** Returns `data` from the `{ success, data }` envelope. */
export async function unwrap<T>(request: Promise<AxiosResponse<ApiSuccess<T>>>): Promise<T> {
  const response = await request;
  return response.data.data;
}

export interface Page<T> {
  items: T[];
  meta: PaginationMeta;
}

/** Returns a list endpoint's rows together with its pagination meta. */
export async function unwrapPage<T>(request: Promise<AxiosResponse<ApiSuccess<T[]>>>): Promise<Page<T>> {
  const { data } = await request;
  return { items: data.data, meta: data.meta! };
}

export function getErrorCode(error: unknown): string | undefined {
  return isAxiosError<ApiFailure>(error) ? error.response?.data?.error?.code : undefined;
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (isAxiosError<ApiFailure>(error)) {
    const message = error.response?.data?.error?.message;
    if (message) return message;
    if (!error.response) return 'Cannot reach the server. Check your connection and try again.';
  }
  return fallback;
}
