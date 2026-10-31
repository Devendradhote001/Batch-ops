import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

let placeholderHash: Promise<string> | undefined;

/**
 * Spends the same bcrypt time as a real check, so a login for an unknown email
 * can't be told apart from a wrong password by response timing.
 */
export async function burnPasswordCheck(plain: string): Promise<void> {
  placeholderHash ??= hashPassword('timing-safe-placeholder');
  await bcrypt.compare(plain, await placeholderHash);
}
