import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { downloadFile } from '@/lib/download';
import type { AnalyticsParams } from '../api';

const OPTIONS = [
  { format: 'xlsx', label: 'Excel (.xlsx)', hint: 'Every batch, session, event and update', icon: FileSpreadsheet },
  { format: 'pdf', label: 'PDF summary', hint: 'A short report to share', icon: FileText },
] as const;

/** Downloads the current Analytics view (same range and filters) as an Excel workbook or a PDF. */
export function ExportMenu({ params }: { params: AnalyticsParams }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const exportAs = async (format: 'xlsx' | 'pdf') => {
    setOpen(false);
    setBusy(format);
    try {
      const filename = await downloadFile(`/reports/${format}`, { ...params }, `batchops-report.${format}`);
      toast.success('Report downloaded', { description: filename });
    } catch (error) {
      toast.error("Couldn't export the report", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div ref={ref} className="relative">
      <Button variant="secondary" onClick={() => setOpen((o) => !o)} disabled={!!busy} aria-haspopup="menu" aria-expanded={open}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        {busy ? 'Preparing…' : 'Export'}
        <ChevronDown className="size-4 text-zinc-400" />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 shadow-lg shadow-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          {OPTIONS.map(({ format, label, hint, icon: Icon }) => (
            <button
              key={format}
              type="button"
              role="menuitem"
              onClick={() => exportAs(format)}
              className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>
              </span>
            </button>
          ))}
          <p className="border-t border-zinc-100 px-3 pt-2 pb-1 text-[11px] text-zinc-400 dark:border-zinc-800">Uses the date range and filters above.</p>
        </div>
      )}
    </div>
  );
}
