import { CheckCircle2, CircleSlash, RotateCcw, type LucideIcon } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { SessionStatus } from '@batchops/shared';
import { useSessionStatus, type AnalyticsParams } from '../api';
import { ChartCard } from './ChartCard';
import { ChartTooltip, type TooltipItem } from './ChartTooltip';
import { STATUS_COLORS } from './theme';

/** Status colours are reserved for status, and each always ships with an icon and a label. */
const STATUS: Record<SessionStatus, { label: string; color: string; icon: LucideIcon }> = {
  completed: { label: 'Completed', color: STATUS_COLORS.good, icon: CheckCircle2 },
  rescheduled: { label: 'Rescheduled', color: STATUS_COLORS.warning, icon: RotateCcw },
  cancelled: { label: 'Cancelled', color: STATUS_COLORS.critical, icon: CircleSlash },
};

export function SessionStatusChart({ params }: { params: AnalyticsParams }) {
  const query = useSessionStatus(params);
  const data = (query.data ?? []).map((d) => ({ ...d, name: STATUS[d.status].label }));
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <ChartCard
      title="Session status"
      description="Every session logged in the range"
      isLoading={query.isPending}
      error={query.error}
      onRetry={() => query.refetch()}
      isEmpty={total === 0}
      emptyMessage="No sessions in this range."
      height={200}
      table={{ columns: ['Status', 'Sessions', 'Share'], rows: data.map((d) => [d.name, d.count, `${pct(d.count)}%`]) }}
    >
      <div className="flex flex-col items-center gap-6 2xl:flex-row 2xl:gap-8">
        <div className="relative size-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.filter((d) => d.count > 0)}
                dataKey="count"
                nameKey="name"
                innerRadius="68%"
                outerRadius="100%"
                paddingAngle={2}
                stroke="var(--chart-surface)"
                strokeWidth={2}
                startAngle={90}
                endAngle={-270}
              >
                {data
                  .filter((d) => d.count > 0)
                  .map((d) => (
                    <Cell key={d.status} fill={STATUS[d.status].color} />
                  ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => (
                  <ChartTooltip
                    active={active}
                    payload={(payload as readonly TooltipItem[] | undefined)?.map((p) => ({ ...p, color: STATUS[(p.payload as { status: SessionStatus }).status].color }))}
                    valueFormatter={(v) => `${v} (${pct(v)}%)`}
                  />
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold">{total}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">sessions</span>
          </div>
        </div>
        <ul className="w-full min-w-0 flex-1 space-y-2.5">
          {data.map((d) => {
            const { icon: Icon, color, label } = STATUS[d.status];
            return (
              <li key={d.status} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <Icon className="size-4" style={{ color }} aria-hidden />
                  {label}
                </span>
                <span className="tabular-nums">
                  <span className="font-medium">{d.count}</span>
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">{pct(d.count)}%</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </ChartCard>
  );
}
