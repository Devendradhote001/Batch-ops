import { z } from 'zod';
import { AVATAR_COLORS, ROLES } from '@batchops/shared';

export const passwordSchema = z.string().min(8, 'Use at least 8 characters').max(128, 'Use at most 128 characters');

export const userFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.email('Enter a valid email address'),
  role: z.enum(ROLES),
  avatarColor: z.enum(AVATAR_COLORS),
});

export const createUserFormSchema = userFormSchema.extend({ password: passwordSchema });

export const resetPasswordFormSchema = z.object({ password: passwordSchema });

export type UserFormValues = z.infer<typeof userFormSchema>;
export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;

/** A readable random password for handing to a new user (no look-alike characters). */
export function generatePassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%';
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}
