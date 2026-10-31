import type { Role } from '@batchops/shared';
import type { AuthUser } from '../../types/express';
import { ApiError } from '../../utils/ApiError';
import { buildMeta, toSkip } from '../../utils/pagination';
import { hashPassword } from '../../utils/password';
import { escapeRegex } from '../../utils/validators';
import { logActivity } from '../activity/activity.service';
import { User } from './user.model';
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from './user.schema';

/** Roles that can be assigned to teach a batch or session. */
export const TEACHING_ROLES: Role[] = ['instructor', 'admin'];

export async function listUsers(query: ListUsersQuery) {
  const filter: Record<string, unknown> = {};
  if (query.role) filter.role = query.role;
  if (query.status) filter.isActive = query.status === 'active';
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const [items, total] = await Promise.all([
    User.find(filter).sort({ isActive: -1, role: 1, name: 1 }).skip(toSkip(query)).limit(query.limit),
    User.countDocuments(filter),
  ]);
  return { items, meta: buildMeta(query, total) };
}

/** Active users for pickers and filters. */
export function listUserOptions(roles: Role[] = TEACHING_ROLES) {
  return User.find({ role: { $in: roles }, isActive: true })
    .select('name avatarColor role')
    .sort({ name: 1 })
    .lean();
}

async function findUserOr404(id: string) {
  const user = await User.findById(id).select('+tokenVersion');
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

async function assertEmailAvailable(email: string, exceptId?: string) {
  const existing = await User.exists({ email, ...(exceptId && { _id: { $ne: exceptId } }) });
  if (existing) throw ApiError.conflict('An account with this email already exists');
}

export async function createUser(actor: AuthUser, { password, ...input }: CreateUserInput) {
  await assertEmailAvailable(input.email);
  const user = await User.create({ ...input, passwordHash: await hashPassword(password) });

  await logActivity({
    actor,
    action: 'created',
    entity: 'user',
    entityId: user._id,
    summary: `${actor.name} added ${user.name} as ${user.role}`,
  });
  return user;
}

export async function updateUser(actor: AuthUser, id: string, input: UpdateUserInput) {
  const user = await findUserOr404(id);

  if (id === actor.id && input.role && input.role !== user.role) {
    throw ApiError.badRequest("You can't change your own role");
  }
  if (input.email && input.email !== user.email) await assertEmailAvailable(input.email, id);

  const roleChanged = input.role && input.role !== user.role;
  user.set(input);
  await user.save();

  await logActivity({
    actor,
    action: 'updated',
    entity: 'user',
    entityId: user._id,
    summary: roleChanged
      ? `${actor.name} changed ${user.name}'s role to ${user.role}`
      : `${actor.name} updated ${user.name}'s profile`,
  });
  return user;
}

export async function setUserStatus(actor: AuthUser, id: string, isActive: boolean) {
  if (id === actor.id) throw ApiError.badRequest("You can't deactivate your own account");

  const user = await findUserOr404(id);
  if (user.isActive === isActive) return user;

  user.isActive = isActive;
  // Deactivation must end every open session immediately.
  if (!isActive) user.tokenVersion += 1;
  await user.save();

  await logActivity({
    actor,
    action: isActive ? 'reactivated' : 'deactivated',
    entity: 'user',
    entityId: user._id,
    summary: `${actor.name} ${isActive ? 'reactivated' : 'deactivated'} ${user.name}`,
  });
  return user;
}

export async function resetPassword(actor: AuthUser, id: string, password: string) {
  if (id === actor.id) throw ApiError.badRequest('Use your profile page to change your own password');

  const user = await findUserOr404(id);
  user.passwordHash = await hashPassword(password);
  user.tokenVersion += 1;
  await user.save();

  await logActivity({
    actor,
    action: 'password-reset',
    entity: 'user',
    entityId: user._id,
    summary: `${actor.name} reset ${user.name}'s password`,
  });
  return user;
}
