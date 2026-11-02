import { Navigate, createBrowserRouter } from 'react-router-dom';
import { FullPageSpinner } from '@/components/FullPageState';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RouteErrorPage } from '@/pages/RouteErrorPage';
import { RequireAuth, RequireRole } from '@/routes/guards';

/*
 * Every page inside the app is code-split: its chunk (and heavy deps like the chart library) loads on first
 * visit. While a chunk loads, the current page stays up and AppShell shows a progress bar.
 */

export const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage />, errorElement: <RouteErrorPage /> },
    {
      path: '/forgot-password',
      errorElement: <RouteErrorPage />,
      lazy: () => import('@/features/auth/pages/ForgotPasswordPage').then((m) => ({ Component: m.ForgotPasswordPage })),
    },
    {
      element: <RequireAuth />,
      errorElement: <RouteErrorPage />,
      HydrateFallback: FullPageSpinner,
      children: [
        {
          element: <AppShell />,
          children: [
            {
              // Render errors in a page stay inside the shell, so navigation keeps working.
              errorElement: <RouteErrorPage />,
              children: [
                { index: true, lazy: () => import('@/features/dashboard/DashboardPage').then((m) => ({ Component: m.DashboardPage })) },
                { path: 'batches', lazy: () => import('@/features/batches/pages/BatchesPage').then((m) => ({ Component: m.BatchesPage })) },
                {
                  path: 'batches/:batchId',
                  lazy: () => import('@/features/batches/pages/BatchDetailPage').then((m) => ({ Component: m.BatchDetailPage })),
                },
                { path: 'sessions', lazy: () => import('@/features/sessions/pages/SessionsPage').then((m) => ({ Component: m.SessionsPage })) },
                { path: 'events', lazy: () => import('@/features/events/pages/EventsPage').then((m) => ({ Component: m.EventsPage })) },
                { path: 'analytics', lazy: () => import('@/features/analytics/pages/AnalyticsPage').then((m) => ({ Component: m.AnalyticsPage })) },
                { path: 'profile', lazy: () => import('@/features/auth/pages/ProfilePage').then((m) => ({ Component: m.ProfilePage })) },
                {
                  element: <RequireRole roles={['admin', 'viewer']} />,
                  children: [
                    { path: 'updates', lazy: () => import('@/features/updates/pages/UpdatesPage').then((m) => ({ Component: m.UpdatesPage })) },
                  ],
                },
                {
                  element: <RequireRole roles={['admin']} />,
                  children: [
                    {
                      path: 'updates/:day/edit',
                      lazy: () => import('@/features/updates/pages/UpdateFormPage').then((m) => ({ Component: m.UpdateFormPage })),
                    },
                    {
                      path: 'admin',
                      children: [
                        { index: true, element: <Navigate to="users" replace /> },
                        { path: 'users', lazy: () => import('@/features/users/pages/UsersPage').then((m) => ({ Component: m.UsersPage })) },
                        {
                          path: 'batches',
                          lazy: () => import('@/features/batches/pages/AdminBatchesPage').then((m) => ({ Component: m.AdminBatchesPage })),
                        },
                      ],
                    },
                  ],
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
