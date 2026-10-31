import { Router } from 'express';
import mongoose from 'mongoose';
import { authenticate } from './middleware/authenticate';
import { authorize } from './middleware/authorize';
import { authRoutes } from './modules/auth/auth.routes';
import { adminBatchRoutes, batchRoutes } from './modules/batches/batch.routes';
import { sessionRoutes } from './modules/sessions/session.routes';
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

/** Everything under /api/admin requires an authenticated admin. */
const adminRouter = Router();
adminRouter.use(authenticate, authorize('admin'));
adminRouter.use('/users', adminUserRoutes);
adminRouter.use('/batches', adminBatchRoutes);
apiRouter.use('/admin', adminRouter);
