import { Router, type Request, type Response } from 'express';
import { getAuthUser } from '../../middleware/authenticate';
import { sendSuccess } from '../../utils/response';
import { getDashboard } from './dashboard.service';

/** Mounted at /api/dashboard — any authenticated user; the content is role-aware. */
export const dashboardRoutes = Router();

dashboardRoutes.get('/', async (req: Request, res: Response) => {
  sendSuccess(res, await getDashboard(getAuthUser(req)));
});
