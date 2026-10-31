import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EVENT_TYPES } from '@batchops/shared';
import { EVENT_TYPE_META } from '@/features/events/meta';
import { useEventsBreakdown, type AnalyticsParams } from '../api';
import { ChartCard } from './ChartCard';
import { ChartLegend } from './ChartLegend';
import { ChartTooltip, type TooltipItem } from './ChartTooltip';
import { axisProps, formatMonth, gridProps, seriesColor } from './theme';

/** Event types keep a fixed slot each, so a type has the same colour whichever types are present. */
const typeColor = (type: (typeof EVENT_TYPES)[number]) => seriesColor(EVENT_TYPES.indexOf(type));

export function EventsByMonthChart({ params }: { params: AnalyticsParams }) {
  const query = useEventsBreakdown(params);
  const types = query.data?.types ?? [];
  const rows = query.data?.byMonth ?? [];

  return (
    <ChartCard
      title="Events per month"
      description="By type, excluding cancelled"
      isLoading={query.isPending}
      error={query.error}
      onRetry={() => query.refetch()}
      isEmpty={types.length === 0}
      emptyMessage="No events in this range."
      table={{
        columns: ['Month', ...types.map((t) => EVENT_TYPE_META[t].label)],
        rows: rows.map((r) => [formatMonth(r.month), ...types.map((t) => Number(r[t] ?? 0))]),
      }}
    >
      <ChartLegend items={types.map((t) => ({ key: t, label: EVENT_TYPE_META[t].label, color: typeColor(t) }))} />
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -24 }} barCategoryGap="30%">
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="month" tickFormatter={formatMonth} {...axisProps} />
          <YAxis allowDecimals={false} {...axisProps} axisLine={false} />
          <Tooltip
            cursor={{ fill: 'var(--chart-cursor)' }}
            content={({ active, payload, label }) => (
              <ChartTooltip active={active} payload={payload as readonly TooltipItem[]} label={label} labelFormatter={formatMonth} showTotal />
            )}
          />
          {types.map((t, i) => (
            <Bar
              key={t}
              dataKey={t}
              name={EVENT_TYPE_META[t].label}
              stackId="events"
              fill={typeColor(t)}
              stroke="var(--chart-surface)"
              strokeWidth={2}
              radius={i === types.length - 1 ? [4, 4, 0, 0] : 0}
              maxBarSize={40}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function EventsLedChart({ params }: { params: AnalyticsParams }) {
  const query = useEventsBreakdown(params);
  const data = query.data?.byPerson ?? [];
  const height = Math.max(140, data.length * 40 + 40);

  return (
    <ChartCard
      title="Events led"
      description="As lead or co-lead, excluding cancelled"
      isLoading={query.isPending}
      error={query.error}
      onRetry={() => query.refetch()}
      isEmpty={data.length === 0}
      emptyMessage="No events in this range."
      height={height}
      table={{ columns: ['Person', 'Led', 'Co-led'], rows: data.map((p) => [p.name, p.led, p.coLed]) }}
    >
      <ChartLegend
        items={[
          { key: 'led', label: 'Led', color: seriesColor(0) },
          { key: 'coLed', label: 'Co-led', color: seriesColor(1) },
        ]}
      />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={10}>
          <CartesianGrid {...gridProps} vertical horizontal={false} />
          <XAxis type="number" allowDecimals={false} {...axisProps} />
          <YAxis type="category" dataKey="name" width={110} {...axisProps} axisLine={false} />
          <Tooltip
            cursor={{ fill: 'var(--chart-cursor)' }}
            content={({ active, payload, label }) => <ChartTooltip active={active} payload={payload as readonly TooltipItem[]} label={label} showTotal />}
          />
          <Bar dataKey="led" name="Led" stackId="led" fill={seriesColor(0)} stroke="var(--chart-surface)" strokeWidth={2} maxBarSize={22} />
          <Bar dataKey="coLed" name="Co-led" stackId="led" fill={seriesColor(1)} stroke="var(--chart-surface)" strokeWidth={2} radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
