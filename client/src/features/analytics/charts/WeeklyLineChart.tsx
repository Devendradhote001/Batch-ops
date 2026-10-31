import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { UseQueryResult } from '@tanstack/react-query';
import type { WeeklySeries } from '../api';
import { ChartCard } from './ChartCard';
import { ChartLegend } from './ChartLegend';
import { ChartTooltip, type TooltipItem } from './ChartTooltip';
import { axisProps, formatWeek, gridProps, useEntityColors } from './theme';

interface WeeklyLineChartProps {
  title: string;
  description: string;
  query: UseQueryResult<WeeklySeries>;
  unit?: '%' | '';
  yDomain?: [number | 'auto' | ((min: number) => number), number | 'auto'];
}

/** One line per batch over weeks. Used for sessions-per-week and attendance trend. */
export function WeeklyLineChart({ title, description, query, unit = '', yDomain = [0, 'auto'] }: WeeklyLineChartProps) {
  const colorFor = useEntityColors();
  const series = query.data?.series ?? [];
  const rows = query.data?.rows ?? [];
  const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v}${unit}`);

  return (
    <ChartCard
      title={title}
      description={description}
      isLoading={query.isPending}
      error={query.error}
      onRetry={() => query.refetch()}
      isEmpty={series.length === 0}
      emptyMessage="No sessions in this range."
      table={{
        columns: ['Week of', ...series.map((s) => s.label)],
        rows: rows.map((r) => [formatWeek(r.week), ...series.map((s) => fmt(r[s.key] as number | null))]),
      }}
    >
      <ChartLegend items={series.map((s) => ({ key: s.key, label: s.label, color: colorFor(s.key) }))} />
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="week" tickFormatter={formatWeek} {...axisProps} minTickGap={16} />
          <YAxis domain={yDomain} allowDecimals={false} tickFormatter={(v) => `${v}${unit}`} {...axisProps} axisLine={false} />
          <Tooltip
            cursor={{ stroke: 'var(--chart-axis)' }}
            content={({ active, payload, label }) => (
              <ChartTooltip
                active={active}
                payload={payload as readonly TooltipItem[]}
                label={label}
                labelFormatter={(w) => `Week of ${formatWeek(w)}`}
                valueFormatter={(v) => `${v}${unit}`}
              />
            )}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="linear"
              dataKey={s.key}
              name={s.label}
              stroke={colorFor(s.key)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--chart-surface)' }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
