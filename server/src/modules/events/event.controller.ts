import type { Request, Response } from 'express';
import { getAuthUser } from '../../middleware/authenticate';
import { sendSuccess } from '../../utils/response';
import type { ListEventsQuery } from './event.schema';
import * as eventService from './event.service';

type IdParams = { id: string };

export async function list(req: Request, res: Response) {
  const { items, meta } = await eventService.listEvents(getAuthUser(req), req.query as unknown as ListEventsQuery);
  sendSuccess(res, items, { meta });
}

export async function get(req: Request<IdParams>, res: Response) {
  sendSuccess(res, await eventService.getEvent(getAuthUser(req), req.params.id));
}

export async function create(req: Request, res: Response) {
  const event = await eventService.createEvent(getAuthUser(req), req.body);
  sendSuccess(res, event, { status: 201, message: 'Event created' });
}

export async function update(req: Request<IdParams>, res: Response) {
  const event = await eventService.updateEvent(getAuthUser(req), req.params.id, req.body);
  sendSuccess(res, event, { message: 'Event updated' });
}

export async function complete(req: Request<IdParams>, res: Response) {
  const event = await eventService.completeEvent(getAuthUser(req), req.params.id, req.body);
  sendSuccess(res, event, { message: 'Event marked completed' });
}

export async function remove(req: Request<IdParams>, res: Response) {
  await eventService.deleteEvent(getAuthUser(req), req.params.id);
  sendSuccess(res, null, { message: 'Event deleted' });
}
