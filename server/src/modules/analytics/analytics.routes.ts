import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import * as controller from './analytics.controller';
import { analyticsQuery } from './analytics.schema';

/**
 * Mounted at /api/analytics. Admins and viewers see the whole vertical; instructors see only their own
 * numbers (the service forces the instructor filter). Daily-update analytics are admin/viewer only.
 */
export const analyticsRoutes = Router();

analyticsRoutes.use(validate({ query: analyticsQuery }));
analyticsRoutes.get('/kpis', controller.kpis);
analyticsRoutes.get('/batch-progress', controller.batchProgress);
analyticsRoutes.get('/sessions-over-time', controller.sessionsOverTime);
analyticsRoutes.get('/instructor-workload', controller.instructorWorkload);
analyticsRoutes.get('/attendance-trend', controller.attendanceTrend);
analyticsRoutes.get('/session-status', controller.sessionStatus);
analyticsRoutes.get('/events', controller.events);
analyticsRoutes.get('/update-consistency', authorize('admin', 'viewer'), controller.updateConsistency);
