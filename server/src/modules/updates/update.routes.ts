import { Router } from 'express';
import { z } from 'zod';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { daySchema } from '../../utils/day';
import * as controller from './update.controller';
import { dayParams, listUpdatesQuery, updateInputSchema } from './update.schema';

/** Mounted at /api/updates — the admin's daily log, read by admins and viewers. */
export const updateRoutes = Router();

updateRoutes.use(authorize('admin', 'viewer'));
updateRoutes.get('/', validate({ query: listUpdatesQuery }), controller.list);
updateRoutes.get('/:day', validate({ params: z.object({ day: daySchema }) }), controller.get);
updateRoutes.put('/:day', authorize('admin'), validate({ params: dayParams, body: updateInputSchema }), controller.save);
