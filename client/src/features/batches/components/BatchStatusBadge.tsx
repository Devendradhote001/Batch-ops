import type { BatchStatus } from '@batchops/shared';
import { Badge } from '@/components/ui/Badge';
import { BATCH_STATUS_META } from '../meta';

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const { label, tone } = BATCH_STATUS_META[status];
  return <Badge tone={tone}>{label}</Badge>;
}
