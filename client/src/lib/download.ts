import { isAxiosError } from 'axios';
import type { ApiFailure } from '@batchops/shared';
import { api, getErrorMessage } from './api';
import { compactParams } from './useUrlFilters';

/**
 * Fetches a file from the API (with the auth cookies) and saves it under the server's filename.
 * Rejects with an Error whose message is ready to show the user.
 */
export async function downloadFile(path: string, params: Record<string, unknown>, fallbackName: string): Promise<string> {
  try {
    const response = await api.get<Blob>(path, { params: compactParams(params), responseType: 'blob' });
    const disposition = String(response.headers['content-disposition'] ?? '');
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;

    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return filename;
  } catch (error) {
    throw new Error(await errorMessage(error));
  }
}

/** With responseType 'blob', API errors arrive as a Blob holding the usual JSON error body. */
async function errorMessage(error: unknown): Promise<string> {
  if (isAxiosError(error) && error.response?.data instanceof Blob) {
    try {
      const body = JSON.parse(await error.response.data.text()) as ApiFailure;
      if (body.error?.message) return body.error.message;
    } catch {
      // Not JSON — fall through to the generic message.
    }
  }
  return getErrorMessage(error, 'Download failed. Please try again.');
}
