import type { ReactNode } from 'react';

export interface TooltipItem {
  dataKey?: string | number | ((obj: unknown) => unknown);
  name?: string | number;
  value?: unknown;
  color?: string;
  payload?: Record<string, unknown>;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly TooltipItem[];
  label?: unknown;
  labelFormatter?: (label: string) => ReactNode;
  valueFormatter?: (value: number, item: TooltipItem) => ReactNode;
  /** Show a total row (for stacked bars). */
  showTotal?: boolean;
}

/** Hover card shared by every chart: swatch carries identity, text stays in text colours. */
export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter, showTotal }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const items = payload.filter((p) => p.value !== null && p.value !== undefined);
  const total = items.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
  const format = (v: number, item: TooltipItem) => (valueFormatter ? valueFormatter(v, item) : v.toLocaleString('en-IN'));

  return (
    <div className="min-w-40 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg shadow-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-900">
      {label !== undefined && (
        <p className="mb-1.5 font-medium text-zinc-900 dark:text-zinc-100">{labelFormatter ? labelFormatter(String(label)) : String(label)}</p>
      )}
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={String(item.dataKey ?? item.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden />
              {item.name}
            </span>
            <span className="font-medium text-zinc-900 tabular-nums dark:text-zinc-100">{format(Number(item.value), item)}</span>
          </li>
        ))}
      </ul>
      {showTotal && items.length > 1 && (
        <p className="mt-1.5 flex justify-between border-t border-zinc-100 pt-1.5 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          Total <span className="font-medium text-zinc-900 tabular-nums dark:text-zinc-100">{format(total, {})}</span>
        </p>
      )}
    </div>
  );
}
