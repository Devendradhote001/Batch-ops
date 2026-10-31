import type { ReactNode } from 'react';
import { BATCH_STATUSES } from '@batchops/shared';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { useUserOptions } from '@/features/users/api';
import { BATCH_STATUS_META } from '../meta';

export interface BatchFilterValues {
  q: string;
  status: string;
  instructor: string;
}

interface BatchFiltersProps {
  values: BatchFilterValues;
  onChange: (patch: Partial<BatchFilterValues>) => void;
  showInstructor: boolean;
  children?: ReactNode;
}

export function BatchFilters({ values, onChange, showInstructor, children }: BatchFiltersProps) {
  const instructors = useUserOptions();

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <SearchInput
        value={values.q}
        onChange={(q) => onChange({ q })}
        placeholder="Search name or code"
        className="sm:max-w-xs sm:flex-1"
      />
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Select value={values.status} onChange={(e) => onChange({ status: e.target.value })} aria-label="Filter by status" wrapperClassName="sm:w-40">
          <option value="">All statuses</option>
          {BATCH_STATUSES.map((s) => (
            <option key={s} value={s}>
              {BATCH_STATUS_META[s].label}
            </option>
          ))}
        </Select>
        {showInstructor && (
          <Select
            value={values.instructor}
            onChange={(e) => onChange({ instructor: e.target.value })}
            aria-label="Filter by instructor"
            wrapperClassName="sm:w-48"
          >
            <option value="">All instructors</option>
            {instructors.data?.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}
              </option>
            ))}
          </Select>
        )}
        {children}
      </div>
    </div>
  );
}
