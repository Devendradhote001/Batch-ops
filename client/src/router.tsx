import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { AnalyticsPage } from '@/features/analytics/pages/AnalyticsPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { ProfilePage } from '@/features/auth/pages/ProfilePage';
import { AdminBatchesPage } from '@/features/batches/pages/AdminBatchesPage';
import { BatchDetailPage } from '@/features/batches/pages/BatchDetailPage';
import { BatchesPage } from '@/features/batches/pages/BatchesPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { EventsPage } from '@/features/events/pages/EventsPage';
import { SessionsPage } from '@/features/sessions/pages/SessionsPage';
import { UpdateFormPage } from '@/features/updates/pages/UpdateFormPage';
import { UpdatesPage } from '@/features/updates/pages/UpdatesPage';
import { UsersPage } from '@/features/users/pages/UsersPage';
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
            { path: 'sessions', element: <SessionsPage /> },
            {
              element: <RequireRole roles={['admin', 'viewer']} />,
              children: [
                { path: 'updates', element: <UpdatesPage /> },
              ],
            },
            { path: 'events', element: <EventsPage /> },
            { path: 'analytics', element: <AnalyticsPage /> },
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
            {
              element: <RequireRole roles={['admin']} />,
              children: [{ path: 'updates/:day/edit', element: <UpdateFormPage /> }],
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
