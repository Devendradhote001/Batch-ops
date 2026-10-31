import type { Request, Response } from 'express';
import { getAuthUser } from '../../middleware/authenticate';
import { sendSuccess } from '../../utils/response';
import type { ListUpdatesQuery } from './update.schema';
import * as updateService from './update.service';

type DayParams = { day: string };

export async function list(req: Request, res: Response) {
  const { items, meta } = await updateService.listUpdates(req.query as unknown as ListUpdatesQuery);
  sendSuccess(res, items, { meta });
}

export async function get(req: Request<DayParams>, res: Response) {
  sendSuccess(res, await updateService.getUpdate(req.params.day));
}

export async function save(req: Request<DayParams>, res: Response) {
  const { update, created } = await updateService.saveUpdate(getAuthUser(req), req.params.day, req.body);
  sendSuccess(res, update, { status: created ? 201 : 200, message: created ? 'Update filed' : 'Update saved' });
}
