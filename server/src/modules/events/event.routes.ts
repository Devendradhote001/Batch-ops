import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { idParams } from '../../utils/validators';
import * as controller from './event.controller';
import { completeEventSchema, eventInputSchema, listEventsQuery } from './event.schema';

/** Mounted at /api/events — any authenticated user (instructors see events they lead). */
export const eventRoutes = Router();
eventRoutes.get('/', validate({ query: listEventsQuery }), controller.list);
eventRoutes.get('/:id', validate({ params: idParams }), controller.get);

/** Mounted at /api/admin/events — admin only. */
export const adminEventRoutes = Router();
adminEventRoutes.post('/', validate({ body: eventInputSchema }), controller.create);
adminEventRoutes.put('/:id', validate({ params: idParams, body: eventInputSchema }), controller.update);
adminEventRoutes.patch('/:id/complete', validate({ params: idParams, body: completeEventSchema }), controller.complete);
adminEventRoutes.delete('/:id', validate({ params: idParams }), controller.remove);
