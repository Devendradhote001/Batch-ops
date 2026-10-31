import type { ReactNode } from 'react';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Browser tab title, when it should differ from the heading (e.g. a greeting). */
  documentTitle?: string;
}

export function PageHeader({ title, description, actions, documentTitle }: PageHeaderProps) {
  useDocumentTitle(documentTitle ?? title);
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
