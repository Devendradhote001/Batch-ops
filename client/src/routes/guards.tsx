import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Role } from '@batchops/shared';
import { FullPageError, FullPageSpinner } from '@/components/FullPageState';
import { useCurrentUser } from '@/features/auth/api';
import { getErrorMessage } from '@/lib/api';
import { ForbiddenPage } from '@/pages/ForbiddenPage';

export function RequireAuth() {
  const { data: user, isPending, isError, error, refetch } = useCurrentUser();
  const location = useLocation();

  if (isPending) return <FullPageSpinner />;
  if (isError) return <FullPageError message={getErrorMessage(error)} onRetry={() => refetch()} />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
}

/** UI-side role gate. The API enforces the same rules; this only decides what to render. */
export function RequireRole({ roles }: { roles: Role[] }) {
  const { data: user } = useCurrentUser();
  if (!user || !roles.includes(user.role)) return <ForbiddenPage />;
  return <Outlet />;
}
