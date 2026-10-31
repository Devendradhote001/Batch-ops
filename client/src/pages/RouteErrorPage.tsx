import { TriangleAlert } from 'lucide-react';
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

/** Shown when a page throws while rendering, or its code chunk fails to load (e.g. after a deploy). */
export function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  if (import.meta.env.DEV) console.error(error);

  const isChunkError = error instanceof Error && /dynamically imported module|Failed to fetch|Importing a module script failed/i.test(error.message);
  const description = isChunkError
    ? 'A newer version of BatchOps is available. Reload to get it.'
    : isRouteErrorResponse(error)
      ? `${error.status} ${error.statusText}`
      : 'An unexpected error stopped this page from loading. Reloading usually fixes it.';

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <EmptyState
        icon={TriangleAlert}
        title={isChunkError ? 'BatchOps was updated' : 'Something went wrong'}
        description={description}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/')}>
              Dashboard
            </Button>
            <Button onClick={() => window.location.reload()}>Reload</Button>
          </div>
        }
      />
    </div>
  );
}
