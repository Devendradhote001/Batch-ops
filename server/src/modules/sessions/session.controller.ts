import type { Request, Response } from 'express';
import { getAuthUser } from '../../middleware/authenticate';
import { sendSuccess } from '../../utils/response';
import type { ListSessionsQuery, SessionCalendarQuery } from './session.schema';
import * as sessionService from './session.service';

type IdParams = { id: string };

export async function list(req: Request, res: Response) {
  const { items, meta } = await sessionService.listSessions(getAuthUser(req), req.query as unknown as ListSessionsQuery);
  sendSuccess(res, items, { meta });
}

export async function calendar(req: Request, res: Response) {
  sendSuccess(res, await sessionService.sessionCalendar(getAuthUser(req), req.query as unknown as SessionCalendarQuery));
}

export async function get(req: Request<IdParams>, res: Response) {
  sendSuccess(res, await sessionService.getSession(getAuthUser(req), req.params.id));
}

export async function create(req: Request, res: Response) {
  const session = await sessionService.createSession(getAuthUser(req), req.body);
  sendSuccess(res, session, { status: 201, message: 'Session logged' });
}

export async function update(req: Request<IdParams>, res: Response) {
  const session = await sessionService.updateSession(getAuthUser(req), req.params.id, req.body);
  sendSuccess(res, session, { message: 'Session updated' });
}

export async function remove(req: Request<IdParams>, res: Response) {
  await sessionService.deleteSession(getAuthUser(req), req.params.id);
  sendSuccess(res, null, { message: 'Session deleted' });
}
