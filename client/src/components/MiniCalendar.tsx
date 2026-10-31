import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { dayjs } from '@/lib/day';

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

interface MiniCalendarProps {
  /** YYYY-MM */
  month: string;
  onMonthChange: (month: string) => void;
  selectedDay: string;
  onSelectDay: (day: string) => void;
  today: string;
  /** Number of items on each day (YYYY-MM-DD → count), shown as dots. */
  counts?: Record<string, number>;
}

/** Compact Monday-first month grid for picking a day. */
export function MiniCalendar({ month, onMonthChange, selectedDay, onSelectDay, today, counts = {} }: MiniCalendarProps) {
  const start = dayjs(`${month}-01`);
  const leadingBlanks = (start.day() + 6) % 7;
  const days = Array.from({ length: start.daysInMonth() }, (_, i) => start.add(i, 'day').format('YYYY-MM-DD'));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">{start.format('MMMM YYYY')}</p>
        <div className="flex gap-0.5">
          <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => onMonthChange(start.subtract(1, 'month').format('YYYY-MM'))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => onMonthChange(start.add(1, 'month').format('YYYY-MM'))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="pb-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
            {label}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const count = counts[day] ?? 0;
          const isSelected = day === selectedDay;
          const isToday = day === today;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              aria-pressed={isSelected}
              aria-label={`${dayjs(day).format('D MMMM')}${count ? `, ${count} item${count > 1 ? 's' : ''}` : ''}`}
              className={cn(
                'relative mx-auto flex size-9 flex-col items-center justify-center rounded-lg text-sm tabular-nums transition-colors',
                isSelected
                  ? 'bg-accent-600 font-semibold text-white dark:bg-accent-500'
                  : isToday
                    ? 'font-semibold text-accent-700 hover:bg-zinc-100 dark:text-accent-300 dark:hover:bg-zinc-800'
                    : day > today
                      ? 'text-zinc-400 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:bg-zinc-800'
                      : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
              )}
            >
              {dayjs(day).date()}
              {count > 0 && (
                <span className="absolute bottom-1 flex gap-0.5" aria-hidden>
                  {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                    <span key={i} className={cn('size-1 rounded-full', isSelected ? 'bg-white/90' : 'bg-accent-500')} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
