import type { Request, Response } from 'express';
import { getAuthUser } from '../../middleware/authenticate';
import { sendSuccess } from '../../utils/response';
import type { AnalyticsFilters } from './analytics.schema';
import * as analytics from './analytics.service';

function filtersFor(req: Request) {
  return analytics.scopeFilters(getAuthUser(req), req.query as unknown as AnalyticsFilters);
}

export async function kpis(req: Request, res: Response) {
  sendSuccess(res, await analytics.kpis(getAuthUser(req), filtersFor(req)));
}

export async function batchProgress(req: Request, res: Response) {
  sendSuccess(res, await analytics.batchProgress(filtersFor(req)));
}

export async function sessionsOverTime(req: Request, res: Response) {
  sendSuccess(res, await analytics.sessionsOverTime(filtersFor(req)));
}

export async function instructorWorkload(req: Request, res: Response) {
  sendSuccess(res, await analytics.instructorWorkload(filtersFor(req)));
}

export async function attendanceTrend(req: Request, res: Response) {
  sendSuccess(res, await analytics.attendanceTrend(filtersFor(req)));
}

export async function sessionStatus(req: Request, res: Response) {
  sendSuccess(res, await analytics.sessionStatus(filtersFor(req)));
}

export async function events(req: Request, res: Response) {
  sendSuccess(res, await analytics.eventsBreakdown(filtersFor(req)));
}

export async function updateConsistency(req: Request, res: Response) {
  sendSuccess(res, await analytics.updateConsistency(filtersFor(req)));
}
