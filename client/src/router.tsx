import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { ProfilePage } from '@/features/auth/pages/ProfilePage';
import { AdminBatchesPage } from '@/features/batches/pages/AdminBatchesPage';
import { BatchDetailPage } from '@/features/batches/pages/BatchDetailPage';
import { BatchesPage } from '@/features/batches/pages/BatchesPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { UsersPage } from '@/features/users/pages/UsersPage';
import { ComingSoonPage } from '@/pages/ComingSoonPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RequireAuth, RequireRole } from '@/routes/guards';

export const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage /> },
    {
      element: <RequireAuth />,
      children: [
        {
          element: <AppShell />,
          children: [
            { index: true, element: <DashboardPage /> },
            { path: 'batches', element: <BatchesPage /> },
            { path: 'batches/:batchId', element: <BatchDetailPage /> },
            {
              path: 'sessions',
              element: <ComingSoonPage title="Sessions" description="Every session logged across batches, by day." phase={3} />,
            },
            {
              element: <RequireRole roles={['admin', 'viewer']} />,
              children: [
                {
                  path: 'updates',
                  element: <ComingSoonPage title="Daily updates" description="End-of-day updates for the vertical." phase={4} />,
                },
              ],
            },
            {
              path: 'events',
              element: <ComingSoonPage title="Events" description="Workshops, hackathons, talks and assessments." phase={4} />,
            },
            {
              path: 'analytics',
              element: <ComingSoonPage title="Analytics" description="Progress, workload and attendance trends." phase={5} />,
            },
            { path: 'profile', element: <ProfilePage /> },
            {
              path: 'admin',
              element: <RequireRole roles={['admin']} />,
              children: [
                { index: true, element: <Navigate to="users" replace /> },
                { path: 'users', element: <UsersPage /> },
                { path: 'batches', element: <AdminBatchesPage /> },
              ],
            },
          ],
        },
      ],
    },
    { path: '*', element: <NotFoundPage /> },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
);
