import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/cn';
import { useWorkload, type AnalyticsParams } from '../api';
import { ChartCard } from './ChartCard';
import { ChartLegend } from './ChartLegend';
import { ChartTooltip, type TooltipItem } from './ChartTooltip';
import { axisProps, formatWeek, gridProps, useEntityColors } from './theme';

type Metric = 'hours' | 'sessions';

/**
 * Weekly workload stacked by instructor. Hours and sessions are different scales, so they're a toggle on
 * one axis rather than a dual-axis chart.
 */
export function WorkloadChart({ params }: { params: AnalyticsParams }) {
  const query = useWorkload(params);
  const colorFor = useEntityColors();
  const [metric, setMetric] = useState<Metric>('hours');
  const series = query.data?.series ?? [];
  const rows = query.data?.[metric] ?? [];
  const unit = metric === 'hours' ? 'h' : '';

  return (
    <ChartCard
      title="Instructor workload"
      description={metric === 'hours' ? 'Teaching hours per week' : 'Sessions taken per week'}
      isLoading={query.isPending}
      error={query.error}
      onRetry={() => query.refetch()}
      isEmpty={series.length === 0}
      emptyMessage="No sessions in this range."
      actions={
        <div className="flex rounded-md border border-zinc-200 p-0.5 text-xs dark:border-zinc-800" role="group" aria-label="Metric">
          {(['hours', 'sessions'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={metric === m}
              onClick={() => setMetric(m)}
              className={cn(
                'rounded px-2 py-0.5 font-medium capitalize transition-colors',
                metric === m ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200',
              )}
            >
              {m}
            </button>
          ))}
        </div>
      }
      table={{
        columns: ['Week of', ...series.map((s) => s.label), 'Total'],
        rows: rows.map((r) => {
          const values = series.map((s) => Number(r[s.key] ?? 0));
          return [formatWeek(r.week), ...values, Math.round(values.reduce((a, b) => a + b, 0) * 10) / 10];
        }),
      }}
    >
      <ChartLegend items={series.map((s) => ({ key: s.key, label: s.label, color: colorFor(s.key) }))} />
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -16 }} barCategoryGap="28%">
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="week" tickFormatter={formatWeek} {...axisProps} minTickGap={16} />
          <YAxis allowDecimals={metric === 'hours'} tickFormatter={(v) => `${v}${unit}`} {...axisProps} axisLine={false} />
          <Tooltip
            cursor={{ fill: 'var(--chart-cursor)' }}
            content={({ active, payload, label }) => (
              <ChartTooltip
                active={active}
                payload={payload as readonly TooltipItem[]}
                label={label}
                labelFormatter={(w) => `Week of ${formatWeek(w)}`}
                valueFormatter={(v) => `${v}${unit}`}
                showTotal
              />
            )}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId="workload"
              fill={colorFor(s.key)}
              // A surface-coloured stroke leaves a 2px gap between stacked segments.
              stroke="var(--chart-surface)"
              strokeWidth={2}
              radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
              maxBarSize={36}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
