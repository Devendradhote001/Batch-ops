import { AlertTriangle } from 'lucide-react';
import { getErrorMessage } from '@/lib/api';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

interface ErrorStateProps {
  title?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = "Couldn't load this", error, onRetry, className }: ErrorStateProps) {
  return (
    <EmptyState
      className={className}
      icon={AlertTriangle}
      title={title}
      description={getErrorMessage(error)}
      action={
        onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    />
  );
}
