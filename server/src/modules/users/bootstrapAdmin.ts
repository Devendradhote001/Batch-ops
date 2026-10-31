import { z } from 'zod';
import { env } from '../../config/env';
import { hashPassword } from '../../utils/password';
import { passwordSchema } from '../auth/auth.schema';
import { User } from './user.model';

const adminSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().pipe(z.email('ADMIN_EMAIL must be a valid email')),
  password: passwordSchema,
});

/** ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD, validated. Throws a readable error if they're missing or invalid. */
function adminFromEnv() {
  const parsed = adminSchema.safeParse({ name: env.ADMIN_NAME, email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD });
  if (!parsed.success) {
    throw new Error(
      `Set a valid ADMIN_EMAIL and ADMIN_PASSWORD first.\n${parsed.error.issues
        .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
        .join('\n')}`,
    );
  }
  return parsed.data;
}

/** Creates the admin from env unless an account with that email exists. Used by `npm run seed`. */
export async function createAdminFromEnv(): Promise<'created' | 'exists'> {
  const { name, email, password } = adminFromEnv();
  if (await User.exists({ email })) return 'exists';
  await User.create({ name, email, role: 'admin', passwordHash: await hashPassword(password) });
  return 'created';
}

/**
 * On boot, for hosts without a shell: if the database has no admin at all and ADMIN_EMAIL / ADMIN_PASSWORD
 * are set, create that admin. Once any admin exists this does nothing, so the env password can't be used to
 * recreate an account after the admin changes their email or password.
 */
export async function ensureFirstAdmin() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return;
  if (await User.exists({ role: 'admin' })) return;
  const result = await createAdminFromEnv();
  if (result === 'created') console.log(`No admin found — created the first admin (${env.ADMIN_EMAIL}).`);
}
