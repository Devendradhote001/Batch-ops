import { Ban, CalendarDays, CheckCircle2, Clock, ExternalLink, Layers, MapPin, Pencil, Trash2, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { VerticalEvent } from '@batchops/shared';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { dayjs, todayIST } from '@/lib/day';
import { EVENT_STATUS_META, EVENT_TYPE_META, formatTimeRange, isUrl } from '../meta';

interface EventDetailModalProps {
  event: VerticalEvent | null;
  onClose: () => void;
  /** Admin actions; omitted for read-only roles. */
  actions?: {
    onEdit: (event: VerticalEvent) => void;
    onComplete: (event: VerticalEvent) => void;
    onCancel: (event: VerticalEvent) => void;
    onDelete: (event: VerticalEvent) => void;
    cancelling: boolean;
  };
}

export function EventDetailModal({ event, onClose, actions }: EventDetailModalProps) {
  if (!event) return null;

  const { icon: TypeIcon, label: typeLabel } = EVENT_TYPE_META[event.type];
  const status = EVENT_STATUS_META[event.status];
  const time = formatTimeRange(event.startTime, event.endTime);
  const canComplete = event.status === 'planned' && event.day <= todayIST();

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={event.title}
      footer={
        actions && (
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <Button variant="ghost" className="text-red-600 hover:text-red-700 sm:mr-auto dark:text-red-400" onClick={() => actions.onDelete(event)}>
              <Trash2 className="size-4" /> Delete
            </Button>
            {event.status === 'planned' && (
              <Button variant="secondary" onClick={() => actions.onCancel(event)} loading={actions.cancelling}>
                <Ban className="size-4" /> Cancel event
              </Button>
            )}
            <Button variant="secondary" onClick={() => actions.onEdit(event)}>
              <Pencil className="size-4" /> Edit
            </Button>
            {canComplete && (
              <Button onClick={() => actions.onComplete(event)}>
                <CheckCircle2 className="size-4" /> Mark completed
              </Button>
            )}
          </div>
        )
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Badge>
            <TypeIcon className="size-3" aria-hidden /> {typeLabel}
          </Badge>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>

        <dl className="space-y-3 text-sm">
          <Row icon={CalendarDays} label="Date">
            {dayjs(event.day).format('dddd, D MMMM YYYY')}
          </Row>
          {time && (
            <Row icon={Clock} label="Time">
              {time} IST
            </Row>
          )}
          {event.location && (
            <Row icon={MapPin} label="Where">
              {isUrl(event.location) ? (
                <a href={event.location} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-accent-700 hover:underline dark:text-accent-300">
                  {event.location} <ExternalLink className="size-3.5 shrink-0" />
                </a>
              ) : (
                event.location
              )}
            </Row>
          )}
          <Row icon={Layers} label="Batches">
            {event.batches.length ? (
              <span className="flex flex-wrap gap-1.5">
                {event.batches.map((b) => (
                  <Link
                    key={b._id}
                    to={`/batches/${b._id}`}
                    onClick={onClose}
                    className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  >
                    {b.code}
                  </Link>
                ))}
              </span>
            ) : (
              'Vertical-wide'
            )}
          </Row>
          <Row icon={Users} label="Led by">
            <span className="flex flex-wrap gap-x-4 gap-y-2">
              {[event.leadBy, ...event.coLeads].map((u, i) => (
                <span key={u._id} className="flex items-center gap-1.5">
                  <Avatar name={u.name} color={u.avatarColor} size="sm" />
                  {u.name}
                  {i === 0 && event.coLeads.length > 0 && <span className="text-xs text-zinc-400">(lead)</span>}
                </span>
              ))}
            </span>
          </Row>
        </dl>

        {event.description && (
          <div>
            <h3 className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">About</h3>
            <p className="text-sm whitespace-pre-line text-zinc-700 dark:text-zinc-300">{event.description}</p>
          </div>
        )}

        {event.status === 'completed' && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{event.participantCount} participants</p>
            {event.outcomeNotes && (
              <p className="mt-1 text-sm whitespace-pre-line text-emerald-900/80 dark:text-emerald-200/80">{event.outcomeNotes}</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="sr-only">{label}</dt>
      <Icon className="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden />
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
