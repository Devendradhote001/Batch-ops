import { z } from 'zod';
import { AVATAR_COLORS, ROLES } from '@batchops/shared';
import { paginationQuery } from '../../utils/pagination';
import { optionalParam, searchParam } from '../../utils/validators';
import { passwordSchema } from '../auth/auth.schema';

const nameSchema = z.string().trim().min(2, 'Name must be at least 2 characters').max(80);
const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'));
const roleSchema = z.enum(ROLES);

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  role: roleSchema,
  password: passwordSchema,
  avatarColor: z.enum(AVATAR_COLORS).optional(),
});

export const updateUserSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    role: roleSchema,
    avatarColor: z.enum(AVATAR_COLORS),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const setUserStatusSchema = z.object({ isActive: z.boolean() });

export const resetPasswordSchema = z.object({ password: passwordSchema });

export const listUsersQuery = paginationQuery.extend({
  q: searchParam,
  role: optionalParam(roleSchema),
  status: optionalParam(z.enum(['active', 'inactive'])),
  /** Only users waiting for an admin to reset their password. */
  resetRequested: optionalParam(z.enum(['true'])),
});

export const userOptionsQuery = z.object({
  roles: optionalParam(
    z
      .string()
      .transform((s) => s.split(',').map((r) => r.trim()))
      .pipe(z.array(roleSchema)),
  ),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuery>;
