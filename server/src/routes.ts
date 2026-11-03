import { Router } from 'express';
import mongoose from 'mongoose';
import { authenticate } from './middleware/authenticate';
import { authorize } from './middleware/authorize';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { adminBatchRoutes, batchRoutes } from './modules/batches/batch.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { adminEventRoutes, eventRoutes } from './modules/events/event.routes';
import { reportRoutes } from './modules/reports/report.routes';
import { sessionRoutes } from './modules/sessions/session.routes';
import { updateRoutes } from './modules/updates/update.routes';
import { adminUserRoutes, userRoutes } from './modules/users/user.routes';
import { sendSuccess } from './utils/response';
import { todayIST } from './utils/day';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  sendSuccess(res, {
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    today: todayIST(),
  });
});

apiRouter.use('/auth', authRoutes);

apiRouter.use('/users', authenticate, userRoutes);
apiRouter.use('/batches', authenticate, batchRoutes);
apiRouter.use('/sessions', authenticate, sessionRoutes);
apiRouter.use('/updates', authenticate, updateRoutes);
apiRouter.use('/events', authenticate, eventRoutes);
apiRouter.use('/dashboard', authenticate, dashboardRoutes);
apiRouter.use('/analytics', authenticate, analyticsRoutes);
apiRouter.use('/reports', authenticate, reportRoutes);

/** Everything under /api/admin requires an authenticated admin. */
const adminRouter = Router();
adminRouter.use(authenticate, authorize('admin'));
adminRouter.use('/users', adminUserRoutes);
adminRouter.use('/batches', adminBatchRoutes);
adminRouter.use('/events', adminEventRoutes);
apiRouter.use('/admin', adminRouter);
