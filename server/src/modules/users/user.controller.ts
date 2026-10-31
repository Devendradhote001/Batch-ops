import type { Request, Response } from 'express';
import { getAuthUser } from '../../middleware/authenticate';
import { sendSuccess } from '../../utils/response';
import type { ListUsersQuery } from './user.schema';
import * as userService from './user.service';

type IdParams = { id: string };

export async function list(req: Request, res: Response) {
  const { items, meta } = await userService.listUsers(req.query as unknown as ListUsersQuery);
  sendSuccess(res, items, { meta });
}

export async function options(req: Request, res: Response) {
  const { roles } = req.query as { roles?: Parameters<typeof userService.listUserOptions>[0] };
  sendSuccess(res, await userService.listUserOptions(roles));
}

export async function create(req: Request, res: Response) {
  const user = await userService.createUser(getAuthUser(req), req.body);
  sendSuccess(res, user, { status: 201, message: 'User created' });
}

export async function update(req: Request<IdParams>, res: Response) {
  const user = await userService.updateUser(getAuthUser(req), req.params.id, req.body);
  sendSuccess(res, user, { message: 'User updated' });
}

export async function setStatus(req: Request<IdParams>, res: Response) {
  const user = await userService.setUserStatus(getAuthUser(req), req.params.id, req.body.isActive);
  sendSuccess(res, user, { message: user.isActive ? 'User reactivated' : 'User deactivated' });
}

export async function resetPassword(req: Request<IdParams>, res: Response) {
  const user = await userService.resetPassword(getAuthUser(req), req.params.id, req.body.password);
  sendSuccess(res, user, { message: 'Password reset' });
}
