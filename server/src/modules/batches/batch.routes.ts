import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { idParams } from '../../utils/validators';
import * as controller from './batch.controller';
import {
  archiveBatchSchema,
  batchInputSchema,
  listBatchesQuery,
  moduleParams,
  toggleModuleSchema,
} from './batch.schema';

/** Mounted at /api/batches — any authenticated user (instructors are scoped in the service). */
export const batchRoutes = Router();
batchRoutes.get('/', validate({ query: listBatchesQuery }), controller.list);
batchRoutes.get('/:id', validate({ params: idParams }), controller.get);

/** Mounted at /api/admin/batches — admin only. */
export const adminBatchRoutes = Router();
adminBatchRoutes.post('/', validate({ body: batchInputSchema }), controller.create);
adminBatchRoutes.put('/:id', validate({ params: idParams, body: batchInputSchema }), controller.update);
adminBatchRoutes.patch('/:id/archive', validate({ params: idParams, body: archiveBatchSchema }), controller.setArchived);
adminBatchRoutes.patch(
  '/:id/modules/:moduleId',
  validate({ params: moduleParams, body: toggleModuleSchema }),
  controller.setModuleCompleted,
);
