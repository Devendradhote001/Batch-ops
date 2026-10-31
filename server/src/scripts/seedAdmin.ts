/**
 * Creates the first admin account from ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD.
 * Safe to re-run: an existing account with that email is left untouched.
 */
import { z } from 'zod';
import { env } from '../config/env';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../modules/users/user.model';
import { passwordSchema } from '../modules/auth/auth.schema';
import { hashPassword } from '../utils/password';

const adminSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().pipe(z.email('ADMIN_EMAIL must be a valid email')),
  password: passwordSchema,
});

async function seedAdmin() {
  const parsed = adminSchema.safeParse({
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  });
  if (!parsed.success) {
    throw new Error(
      `Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env first.\n${parsed.error.issues
        .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
        .join('\n')}`,
    );
  }
  const { name, email, password } = parsed.data;

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`An account for ${email} already exists (role: ${existing.role}). Nothing to do.`);
    return;
  }

  await User.create({ name, email, role: 'admin', passwordHash: await hashPassword(password) });
  console.log(`Admin account created for ${email}.`);
}

seedAdmin()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
