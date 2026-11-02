import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { forgotPasswordLimiter, loginLimiter, refreshLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import * as controller from './auth.controller';
import { changePasswordSchema, forgotPasswordSchema, loginSchema } from './auth.schema';

export const authRoutes = Router();

authRoutes.post('/login', loginLimiter, validate({ body: loginSchema }), controller.login);
authRoutes.post('/forgot-password', forgotPasswordLimiter, validate({ body: forgotPasswordSchema }), controller.forgotPassword);
authRoutes.post('/refresh', refreshLimiter, controller.refresh);
authRoutes.post('/logout', controller.logout);
authRoutes.get('/me', authenticate, controller.me);
authRoutes.patch('/me/password', authenticate, validate({ body: changePasswordSchema }), controller.changePassword);
