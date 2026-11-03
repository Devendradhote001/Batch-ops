import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getAuthUser } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { analyticsQuery, type AnalyticsFilters } from '../analytics/analytics.schema';
import { gatherReport } from './report.data';
import { buildExcel } from './report.excel';
import { buildPdf } from './report.pdf';

const FORMATS = {
  xlsx: { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', build: buildExcel },
  pdf: { contentType: 'application/pdf', build: buildPdf },
} as const;

/**
 * Mounted at /api/reports. GET /api/reports/xlsx|pdf?from&to&batch&instructor downloads a report built with the
 * same filters as the Analytics page. Admins and viewers (it includes daily updates).
 */
export const reportRoutes = Router();

reportRoutes.get(
  '/:format',
  authorize('admin', 'viewer'),
  validate({ params: z.object({ format: z.enum(['xlsx', 'pdf']) }), query: analyticsQuery }),
  async (req: Request<{ format: keyof typeof FORMATS }>, res: Response) => {
    const filters = req.query as unknown as AnalyticsFilters;
    const format = FORMATS[req.params.format];
    const file = await format.build(await gatherReport(getAuthUser(req), filters));

    const filename = `batchops-report_${filters.from}_to_${filters.to}.${req.params.format}`;
    res.setHeader('Content-Type', format.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(file);
  },
);
