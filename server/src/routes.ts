import { Router } from 'express';
import mongoose from 'mongoose';
import { authenticate } from './middleware/authenticate';
import { authorize } from './middleware/authorize';
import { authRoutes } from './modules/auth/auth.routes';
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

/** Everything under /api/admin requires an authenticated admin. Admin modules mount here. */
export const adminRouter = Router();
adminRouter.use(authenticate, authorize('admin'));
apiRouter.use('/admin', adminRouter);
