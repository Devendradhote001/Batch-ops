import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { ProfilePage } from '@/features/auth/pages/ProfilePage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
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
            {
              path: 'batches',
              element: <ComingSoonPage title="Batches" description="All batches, their progress and syllabus." phase={2} />,
            },
            {
              path: 'batches/:batchId',
              element: <ComingSoonPage title="Batch" description="Batch details, sessions and events." phase={2} />,
            },
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
                {
                  path: 'users',
                  element: <ComingSoonPage title="Users" description="Create and manage instructor and viewer accounts." phase={2} />,
                },
                {
                  path: 'batches',
                  element: <ComingSoonPage title="Manage batches" description="Create, edit and archive batches." phase={2} />,
                },
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
