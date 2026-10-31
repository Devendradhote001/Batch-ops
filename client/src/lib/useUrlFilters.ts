import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * List filters stored in the URL, so a filtered view can be bookmarked or shared.
 * Changing any filter other than `page` resets to page 1. Pass `keys` as a module-level constant.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(() => {
    const values = Object.fromEntries(keys.map((key) => [key, params.get(key) ?? ''])) as Record<K, string>;
    return { ...values, page: Math.max(1, Number(params.get('page')) || 1) };
  }, [params, keys]);

  const setFilters = useCallback(
    (patch: Partial<Record<K | 'page', string | number>>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value === '' || value === undefined || (key === 'page' && value === 1)) next.delete(key);
            else next.set(key, String(value));
          }
          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return [filters, setFilters] as const;
}

/** Drops empty values so they aren't sent as `?key=`. */
export function compactParams<T extends Record<string, unknown>>(params: T): Partial<T> {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)) as Partial<T>;
}
