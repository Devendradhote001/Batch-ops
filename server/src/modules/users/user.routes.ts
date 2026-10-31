import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { idParams } from '../../utils/validators';
import * as controller from './user.controller';
import {
  createUserSchema,
  listUsersQuery,
  resetPasswordSchema,
  setUserStatusSchema,
  updateUserSchema,
  userOptionsQuery,
} from './user.schema';

/** Mounted at /api/users — any authenticated user. */
export const userRoutes = Router();
userRoutes.get('/options', validate({ query: userOptionsQuery }), controller.options);

/** Mounted at /api/admin/users — admin only. */
export const adminUserRoutes = Router();
adminUserRoutes.get('/', validate({ query: listUsersQuery }), controller.list);
adminUserRoutes.post('/', validate({ body: createUserSchema }), controller.create);
adminUserRoutes.patch('/:id', validate({ params: idParams, body: updateUserSchema }), controller.update);
adminUserRoutes.patch('/:id/status', validate({ params: idParams, body: setUserStatusSchema }), controller.setStatus);
adminUserRoutes.post(
  '/:id/reset-password',
  validate({ params: idParams, body: resetPasswordSchema }),
  controller.resetPassword,
);
