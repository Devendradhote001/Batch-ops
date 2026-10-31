import { ClipboardList, Mic, Sparkles, Trophy, Video, Wrench, type LucideIcon } from 'lucide-react';
import type { EventStatus, EventType } from '@batchops/shared';
import type { BadgeTone } from '@/components/ui/Badge';
import { formatTime } from '@/features/batches/meta';

export const EVENT_TYPE_META: Record<EventType, { label: string; icon: LucideIcon }> = {
  workshop: { label: 'Workshop', icon: Wrench },
  hackathon: { label: 'Hackathon', icon: Trophy },
  webinar: { label: 'Webinar', icon: Video },
  'guest-talk': { label: 'Guest talk', icon: Mic },
  assessment: { label: 'Assessment', icon: ClipboardList },
  other: { label: 'Other', icon: Sparkles },
};

export const EVENT_STATUS_META: Record<EventStatus, { label: string; tone: BadgeTone }> = {
  planned: { label: 'Planned', tone: 'accent' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export function formatTimeRange(start: string, end: string) {
  if (start && end) return `${formatTime(start)} – ${formatTime(end)}`;
  if (start) return formatTime(start);
  return '';
}

export function isUrl(value: string) {
  return /^https?:\/\//i.test(value);
}
