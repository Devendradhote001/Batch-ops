import type { Request, Response } from 'express';
import { getAuthUser } from '../../middleware/authenticate';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/response';
import type { UserDocument } from '../users/user.model';
import * as authService from './auth.service';
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from './auth.tokens';

function issueSession(res: Response, user: UserDocument) {
  setAuthCookies(res, { id: user.id, role: user.role, tokenVersion: user.tokenVersion });
}

export async function login(req: Request, res: Response) {
  const user = await authService.login(req.body);
  issueSession(res, user);
  sendSuccess(res, user, { message: 'Signed in' });
}

export async function refresh(req: Request, res: Response) {
  const token: string | undefined = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('No active session', 'NO_SESSION');

  try {
    const user = await authService.refresh(token);
    issueSession(res, user);
    sendSuccess(res, user);
  } catch (err) {
    clearAuthCookies(res);
    throw err;
  }
}

export async function forgotPassword(req: Request, res: Response) {
  const mode = await authService.requestPasswordReset(req.body.email);
  sendSuccess(res, { mode }, {
    message:
      mode === 'email'
        ? "If that email has an account, we've sent it a reset link. It expires in 30 minutes."
        : 'If that email has an account, your admin has been asked to reset its password.',
  });
}

export async function resetPassword(req: Request, res: Response) {
  await authService.resetPasswordWithToken(req.body);
  sendSuccess(res, null, { message: 'Password updated. Sign in with your new password.' });
}

export async function logout(_req: Request, res: Response) {
  clearAuthCookies(res);
  sendSuccess(res, null, { message: 'Signed out' });
}

export async function me(req: Request, res: Response) {
  const user = await authService.getCurrentUser(getAuthUser(req).id);
  sendSuccess(res, user);
}

export async function changePassword(req: Request, res: Response) {
  const user = await authService.changePassword(getAuthUser(req).id, req.body);
  // tokenVersion changed, so this device needs a fresh pair to stay signed in.
  issueSession(res, user);
  sendSuccess(res, user, { message: 'Password updated' });
}
