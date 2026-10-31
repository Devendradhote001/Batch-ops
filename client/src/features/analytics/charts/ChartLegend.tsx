export interface LegendItem {
  key: string;
  label: string;
  color: string;
}

/** HTML legend above the plot. Always rendered for two or more series so identity is never colour-alone. */
export function ChartLegend({ items }: { items: LegendItem[] }) {
  if (items.length < 2) return null;
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
