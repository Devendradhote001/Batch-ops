import { AlertTriangle, CheckCircle2, OctagonX, type LucideIcon } from 'lucide-react';
import type { UpdateStatus } from '@batchops/shared';
import type { BadgeTone } from '@/components/ui/Badge';

export const UPDATE_STATUS_META: Record<UpdateStatus, { label: string; tone: BadgeTone; icon: LucideIcon; hint: string }> = {
  'on-track': { label: 'On track', tone: 'success', icon: CheckCircle2, hint: 'Everything is moving as planned.' },
  'at-risk': { label: 'At risk', tone: 'warning', icon: AlertTriangle, hint: 'Something may slip without attention.' },
  blocked: { label: 'Blocked', tone: 'danger', icon: OctagonX, hint: 'Work is stuck and needs help.' },
};
