/**
 * Creates the first admin account from ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD.
 * Safe to re-run: an existing account with that email is left untouched.
 */
import { env } from '../config/env';
import { connectDB, disconnectDB } from '../config/db';
import { createAdminFromEnv } from '../modules/users/bootstrapAdmin';

async function seedAdmin() {
  await connectDB();
  const result = await createAdminFromEnv();
  console.log(
    result === 'created'
      ? `Admin account created for ${env.ADMIN_EMAIL}.`
      : `An account for ${env.ADMIN_EMAIL} already exists. Nothing to do.`,
  );
}

seedAdmin()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
