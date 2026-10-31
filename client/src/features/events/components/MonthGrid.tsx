import { Check } from 'lucide-react';
import type { VerticalEvent } from '@batchops/shared';
import { cn } from '@/lib/cn';
import { dayjs } from '@/lib/day';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_CHIPS = 3;

interface MonthGridProps {
  /** YYYY-MM */
  month: string;
  events: VerticalEvent[];
  selectedDay: string;
  today: string;
  onSelectDay: (day: string) => void;
  onOpenEvent: (event: VerticalEvent) => void;
}

/** Monday-first month calendar. Event chips from `sm` up; dots on phones, where tapping a day shows its agenda. */
export function MonthGrid({ month, events, selectedDay, today, onSelectDay, onOpenEvent }: MonthGridProps) {
  const first = dayjs(`${month}-01`);
  const gridStart = first.subtract((first.day() + 6) % 7, 'day');
  const weeks = Math.ceil(((first.day() + 6) % 7 + first.daysInMonth()) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => gridStart.add(i, 'day').format('YYYY-MM-DD'));

  const byDay = new Map<string, VerticalEvent[]>();
  for (const e of events) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-zinc-500 sm:text-left dark:text-zinc-400">
            <span className="sm:hidden">{d[0]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const inMonth = day.startsWith(month);
          const dayEvents = inMonth ? (byDay.get(day) ?? []) : [];
          const isSelected = day === selectedDay;
          const isToday = day === today;
          return (
            <div
              key={day}
              role="button"
              tabIndex={0}
              aria-label={`${dayjs(day).format('D MMMM')}, ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`}
              aria-pressed={isSelected}
              onClick={() => onSelectDay(day)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelectDay(day))}
              className={cn(
                'relative flex min-h-14 cursor-pointer flex-col gap-1 border-zinc-100 p-1 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40 focus-visible:ring-inset sm:min-h-24 sm:p-1.5 dark:border-zinc-800',
                i % 7 !== 6 && 'border-r',
                i < days.length - 7 && 'border-b',
                !inMonth && 'bg-zinc-50/60 dark:bg-zinc-950/40',
                isSelected ? 'bg-accent-50/70 dark:bg-accent-500/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30',
              )}
            >
              <span
                className={cn(
                  'flex size-6 items-center justify-center self-center rounded-full text-xs tabular-nums sm:self-start',
                  isToday ? 'bg-accent-600 font-semibold text-white dark:bg-accent-500' : inMonth ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-300 dark:text-zinc-600',
                )}
              >
                {dayjs(day).date()}
              </span>

              {dayEvents.length > 0 && (
                <>
                  <span className="flex justify-center gap-0.5 sm:hidden" aria-hidden>
                    {dayEvents.slice(0, 3).map((e) => (
                      <span key={e._id} className={cn('size-1.5 rounded-full', e.status === 'cancelled' ? 'bg-zinc-300 dark:bg-zinc-600' : 'bg-accent-500')} />
                    ))}
                  </span>
                  <span className="hidden flex-col gap-0.5 sm:flex">
                    {dayEvents.slice(0, MAX_CHIPS).map((e) => (
                      <button
                        key={e._id}
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onOpenEvent(e);
                        }}
                        title={e.title}
                        className={cn(
                          'flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-xs font-medium transition-colors',
                          e.status === 'planned' &&
                            'bg-accent-50 text-accent-700 hover:bg-accent-100 dark:bg-accent-500/15 dark:text-accent-200 dark:hover:bg-accent-500/25',
                          e.status === 'completed' &&
                            'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700',
                          e.status === 'cancelled' && 'text-zinc-400 line-through hover:bg-zinc-100 dark:hover:bg-zinc-800',
                        )}
                      >
                        {e.status === 'completed' && <Check className="size-3 shrink-0" aria-hidden />}
                        <span className="truncate">{e.title}</span>
                      </button>
                    ))}
                    {dayEvents.length > MAX_CHIPS && (
                      <span className="px-1.5 text-xs text-zinc-500 dark:text-zinc-400">+{dayEvents.length - MAX_CHIPS} more</span>
                    )}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
