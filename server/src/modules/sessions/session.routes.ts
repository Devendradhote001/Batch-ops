import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { idParams } from '../../utils/validators';
import * as controller from './session.controller';
import { listSessionsQuery, sessionCalendarQuery, sessionInputSchema } from './session.schema';

/**
 * Mounted at /api/sessions. Everyone signed in can read (instructors are scoped to their batches);
 * admins and instructors can write, with ownership enforced in the service.
 */
export const sessionRoutes = Router();

const canWrite = authorize('admin', 'instructor');

sessionRoutes.get('/', validate({ query: listSessionsQuery }), controller.list);
sessionRoutes.get('/calendar', validate({ query: sessionCalendarQuery }), controller.calendar);
sessionRoutes.get('/:id', validate({ params: idParams }), controller.get);
sessionRoutes.post('/', canWrite, validate({ body: sessionInputSchema }), controller.create);
sessionRoutes.put('/:id', canWrite, validate({ params: idParams, body: sessionInputSchema }), controller.update);
sessionRoutes.delete('/:id', canWrite, validate({ params: idParams }), controller.remove);
