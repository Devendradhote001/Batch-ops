import type { UpdateStatus } from '@batchops/shared';
import { Badge } from '@/components/ui/Badge';
import { UPDATE_STATUS_META } from '../meta';

export function UpdateStatusBadge({ status }: { status: UpdateStatus }) {
  const { label, tone, icon: Icon } = UPDATE_STATUS_META[status];
  return (
    <Badge tone={tone}>
      <Icon className="size-3" aria-hidden /> {label}
    </Badge>
  );
}
