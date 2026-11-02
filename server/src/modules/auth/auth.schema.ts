import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 8;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(128, 'Password must be at most 128 characters');

const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'));

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordWithTokenSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/, 'This reset link is invalid'),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current one',
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordWithTokenInput = z.infer<typeof resetPasswordWithTokenSchema>;
