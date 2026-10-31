import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useBatchProgress, type AnalyticsParams } from '../api';
import { ChartCard } from './ChartCard';
import { ChartTooltip, type TooltipItem } from './ChartTooltip';
import { axisProps, gridProps, seriesColor } from './theme';

/** Completed vs planned sessions per batch — a single series, so one colour and no legend. */
export function BatchProgressChart({ params }: { params: AnalyticsParams }) {
  const query = useBatchProgress(params);
  const data = query.data ?? [];
  const height = Math.max(160, data.length * 44 + 40);

  return (
    <ChartCard
      title="Batch progress"
      description="Completed of planned sessions, all time"
      isLoading={query.isPending}
      error={query.error}
      onRetry={() => query.refetch()}
      isEmpty={data.length === 0}
      emptyMessage="No batches match these filters."
      height={height}
      table={{
        columns: ['Batch', 'Completed', 'Planned', 'Progress'],
        rows: data.map((b) => [b.code, b.completed, b.planned, `${b.progress}%`]),
      }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }} barCategoryGap={10}>
          <CartesianGrid {...gridProps} vertical horizontal={false} />
          <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} {...axisProps} />
          <YAxis type="category" dataKey="code" width={96} {...axisProps} axisLine={false} />
          <Tooltip
            cursor={{ fill: 'var(--chart-cursor)' }}
            content={({ active, payload, label }) => (
              <ChartTooltip
                active={active}
                payload={payload as readonly TooltipItem[]}
                label={label}
                valueFormatter={(v, item) => {
                  const row = item.payload as { completed: number; planned: number } | undefined;
                  return row ? `${v}% (${row.completed}/${row.planned})` : `${v}%`;
                }}
              />
            )}
          />
          <Bar dataKey="progress" name="Progress" fill={seriesColor(0)} radius={[0, 4, 4, 0]} maxBarSize={22}>
            <LabelList dataKey="progress" position="right" formatter={(v: unknown) => `${v}%`} className="fill-zinc-600 text-xs dark:fill-zinc-300" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
